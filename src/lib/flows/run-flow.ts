import { z } from "zod";
import type { ExplainV1 } from "@/lib/matching/inference/explain";
import { translateOne, type TranslateResponse } from "@/lib/translate/translate-service";
import type { FlowFieldMapping, FlowPack, FlowPackVersion } from "@/lib/domain/types";
import type { IFlowRepository } from "@/lib/flows/flow-repository.interface";
import { getFlowRepository } from "@/lib/flows/get-flow-repository";
import {
  applyFlowMappingOverrides,
  appliedOverridesForOrdinal,
  selectPinnedFlowVersionId,
} from "@/lib/flows/overrides";
import { applyFlowTransform } from "@/lib/flows/transforms";
import { getGovernanceRepository } from "@/lib/governance/get-governance-repository";
import { type FlowTransform } from "@/lib/flows/schema";

export const flowTranslateRequestSchema = z.object({
  flow_key: z.string().min(1),
  version: z.string().optional(),
  source_record: z.record(z.string(), z.unknown()),
  organization_id: z.string().optional(),
  context: z.record(z.string(), z.unknown()).optional(),
});

export type FlowTranslateRequest = z.infer<typeof flowTranslateRequestSchema>;

export type FlowFieldStatus = "matched" | "suggested" | "unmatched" | "unmapped" | "skipped";

export interface FlowFieldOutput {
  ordinal: number;
  kind: "direct" | "translate";
  source_field_key: string;
  target_field_key: string;
  status: FlowFieldStatus;
  value: string | null;
  confidence: number;
  reason: string | null;
  is_required: boolean;
  explain: ExplainV1 | null;
  trace?: { applied_overrides: string[] };
}

export interface FlowTranslateResponse {
  flow: { key: string; version: string };
  status: "ok" | "incomplete" | "not_found";
  fields: FlowFieldOutput[];
  unmapped: FlowFieldOutput[];
  trace: {
    engine_version: "1";
    deterministic_only: true;
    flow_pack_version_id: string | null;
    fallbacks: { translate_via_inference_count: 0 };
    applied_overrides?: string[];
  };
}

interface RunFlowDeps {
  repo?: IFlowRepository;
  /** Override the translate function for tests so we don't hit the real inference engine. */
  translate?: typeof translateOne;
}

export async function runFlow(
  request: FlowTranslateRequest,
  deps: RunFlowDeps = {},
): Promise<FlowTranslateResponse> {
  const parsed = flowTranslateRequestSchema.parse(request);
  const repo = deps.repo ?? getFlowRepository();
  const translateFn = deps.translate ?? translateOne;
  let versionEntry = await repo.getFlowVersion(parsed.flow_key, parsed.version);

  let appliedOverrideLabels: string[] = [];

  if (versionEntry && parsed.organization_id) {
    const governance = getGovernanceRepository();
    const overrideRows = await governance.listFlowPackOverrides(parsed.organization_id, versionEntry.pack.id);
    const pinId = selectPinnedFlowVersionId(overrideRows);
    if (pinId) {
      const pinned = await repo.getFlowVersionById(pinId);
      if (pinned) {
        versionEntry = pinned;
      }
    }
    const adjusted = applyFlowMappingOverrides(versionEntry.mappings, overrideRows);
    versionEntry = { ...versionEntry, mappings: adjusted.mappings };
    appliedOverrideLabels = adjusted.appliedOverrides;
  }

  if (!versionEntry) {
    return {
      flow: { key: parsed.flow_key, version: parsed.version ?? "unknown" },
      status: "not_found",
      fields: [],
      unmapped: [],
      trace: {
        engine_version: "1",
        deterministic_only: true,
        flow_pack_version_id: null,
        fallbacks: { translate_via_inference_count: 0 },
        applied_overrides: [],
      },
    };
  }

  const fields: FlowFieldOutput[] = [];
  for (const mapping of versionEntry.mappings) {
    const sourceValue = parsed.source_record[mapping.sourceFieldKey];
    const ordTrace = { applied_overrides: appliedOverridesForOrdinal(appliedOverrideLabels, mapping.ordinal) };
    if (mapping.kind === "direct") {
      fields.push({ ...handleDirect(mapping, sourceValue), trace: ordTrace });
    } else {
      const output = await handleTranslate(mapping, sourceValue, parsed, translateFn);
      fields.push({ ...output, trace: ordTrace });
    }
  }

  const unmapped = fields.filter(
    (field) => field.status === "unmapped" || (field.status === "unmatched" && field.is_required),
  );
  const status: FlowTranslateResponse["status"] = fields.every((field) => isOk(field, field.is_required))
    ? "ok"
    : "incomplete";

  return {
    flow: { key: versionEntry.pack.key, version: versionEntry.version.version },
    status,
    fields,
    unmapped,
    trace: {
      engine_version: "1",
      deterministic_only: true,
      flow_pack_version_id: versionEntry.version.id,
      fallbacks: { translate_via_inference_count: 0 },
      applied_overrides: appliedOverrideLabels,
    },
  };
}

export async function runFlowBatch(
  requests: FlowTranslateRequest[],
  deps: RunFlowDeps = {},
): Promise<FlowTranslateResponse[]> {
  return Promise.all(requests.map((req) => runFlow(req, deps)));
}

function handleDirect(mapping: FlowFieldMapping, sourceValue: unknown): FlowFieldOutput {
  const transform = (mapping.transform ?? { op: "copy" }) as FlowTransform;
  let value: string | null;
  let reason: string | null = null;
  try {
    value = applyFlowTransform(sourceValue, transform);
  } catch (error) {
    return {
      ordinal: mapping.ordinal,
      kind: "direct",
      source_field_key: mapping.sourceFieldKey,
      target_field_key: mapping.targetFieldKey,
      status: "unmapped",
      value: null,
      confidence: 0,
      reason: error instanceof Error ? error.message : "transform_failed",
      is_required: mapping.isRequired,
      explain: null,
    };
  }

  if (value == null || value === "") {
    reason = sourceValue == null || sourceValue === "" ? "missing_source_value" : "transform_empty_result";
    return {
      ordinal: mapping.ordinal,
      kind: "direct",
      source_field_key: mapping.sourceFieldKey,
      target_field_key: mapping.targetFieldKey,
      status: "skipped",
      value: null,
      confidence: 0,
      reason,
      is_required: mapping.isRequired,
      explain: null,
    };
  }

  return {
    ordinal: mapping.ordinal,
    kind: "direct",
    source_field_key: mapping.sourceFieldKey,
    target_field_key: mapping.targetFieldKey,
    status: "matched",
    value,
    confidence: 1,
    reason: null,
    is_required: mapping.isRequired,
    explain: null,
  };
}

async function handleTranslate(
  mapping: FlowFieldMapping,
  sourceValue: unknown,
  parsed: FlowTranslateRequest,
  translateFn: typeof translateOne,
): Promise<FlowFieldOutput> {
  if (sourceValue == null || sourceValue === "") {
    return {
      ordinal: mapping.ordinal,
      kind: "translate",
      source_field_key: mapping.sourceFieldKey,
      target_field_key: mapping.targetFieldKey,
      status: "skipped",
      value: null,
      confidence: 0,
      reason: "missing_source_value",
      is_required: mapping.isRequired,
      explain: null,
    };
  }

  const opts = mapping.options as { require_deterministic?: boolean; min_confidence?: number };
  const requireDeterministic = opts.require_deterministic ?? true;
  const minConfidence = opts.min_confidence ?? 0.95;

  let response: TranslateResponse;
  try {
    response = await translateFn({
      from_field_key: mapping.sourceFieldKey,
      value: String(sourceValue),
      to_field_key: mapping.targetFieldKey,
      context: parsed.context,
      organization_id: parsed.organization_id,
    });
  } catch (error) {
    return {
      ordinal: mapping.ordinal,
      kind: "translate",
      source_field_key: mapping.sourceFieldKey,
      target_field_key: mapping.targetFieldKey,
      status: "unmapped",
      value: null,
      confidence: 0,
      reason: error instanceof Error ? error.message : "translate_failed",
      is_required: mapping.isRequired,
      explain: null,
    };
  }

  const top = response.candidates[0];
  if (!top) {
    return {
      ordinal: mapping.ordinal,
      kind: "translate",
      source_field_key: mapping.sourceFieldKey,
      target_field_key: mapping.targetFieldKey,
      status: "unmapped",
      value: null,
      confidence: 0,
      reason: "no_candidates",
      is_required: mapping.isRequired,
      explain: response.explain,
    };
  }

  const isDeterministic = top.via === "crosswalk" || top.via === "exact_value" || top.via === "concept_graph";
  const confidence = Number(top.score.toFixed(4));

  if (requireDeterministic && !isDeterministic) {
    return {
      ordinal: mapping.ordinal,
      kind: "translate",
      source_field_key: mapping.sourceFieldKey,
      target_field_key: mapping.targetFieldKey,
      status: "unmapped",
      value: null,
      confidence,
      reason: `non_deterministic_path:${top.via}`,
      is_required: mapping.isRequired,
      explain: response.explain,
    };
  }

  if (confidence < minConfidence) {
    return {
      ordinal: mapping.ordinal,
      kind: "translate",
      source_field_key: mapping.sourceFieldKey,
      target_field_key: mapping.targetFieldKey,
      status: "unmapped",
      value: top.key ?? null,
      confidence,
      reason: `below_min_confidence:${minConfidence}`,
      is_required: mapping.isRequired,
      explain: response.explain,
    };
  }

  return {
    ordinal: mapping.ordinal,
    kind: "translate",
    source_field_key: mapping.sourceFieldKey,
    target_field_key: mapping.targetFieldKey,
    status: "matched",
    value: top.key,
    confidence,
    reason: null,
    is_required: mapping.isRequired,
    explain: response.explain,
  };
}

function isOk(field: FlowFieldOutput, required: boolean): boolean {
  if (field.status === "matched") return true;
  if (!required && field.status === "skipped") return true;
  return false;
}

export type FlowExecutionContext = {
  pack: FlowPack;
  version: FlowPackVersion;
};
