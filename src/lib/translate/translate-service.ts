import { z } from "zod";
import { getFieldRepository } from "@/lib/repositories/get-field-repository";
import { runInference } from "@/lib/matching/inference/engine";
import { resolveEnumValuesCanonicalField } from "@/lib/matching/field-reference-resolver";
import { translateIndustryCode } from "@/lib/industry/concept-service";
import { buildExplain, emptyExplain, type ExplainV1 } from "@/lib/matching/inference/explain";
import { classifyWithPolicy, inferDomain } from "@/lib/matching/inference/policy";
import { makeSignal } from "@/lib/matching/inference/signal";
import { DEFAULT_WEIGHTS } from "@/lib/matching/inference/weights";
import { scoreCandidate, type CandidateSignals } from "@/lib/matching/inference/scorer";
import type { FieldType, FieldValue } from "@/lib/domain/types";
import type { IndustryCodeSystem } from "@/lib/industry/types";
import type { IFieldRepository } from "@/lib/repositories/field-repository.interface";

export const translateRequestSchema = z.object({
  from_field_key: z.string(),
  value: z.string(),
  to_field_key: z.string(),
  context: z.record(z.string(), z.unknown()).optional(),
  organization_id: z.string().optional(),
});

export type TranslateRequest = z.infer<typeof translateRequestSchema>;

export type TranslateCandidate = {
  to_value_id: string;
  key: string;
  label: string;
  score: number;
  via: "crosswalk" | "concept_graph" | "exact_value";
  source: string | null;
};

export type TranslateResponse = {
  status: "matched" | "suggested" | "review" | "unmatched";
  needs_review: boolean;
  from: {
    field_key: string;
    value_id: string | null;
    key: string | null;
    label: string | null;
    confidence: number;
  };
  candidates: TranslateCandidate[];
  trace: {
    from_resolved_via: "canonical_ref" | null;
    from_canonical_field_key?: string;
    to_resolved_via: "canonical_ref" | null;
    to_canonical_field_key?: string;
    fallback_used: "concept_graph" | null;
  };
  explain: ExplainV1;
};

const INDUSTRY_FIELD_TO_SYSTEM: Record<string, IndustryCodeSystem> = {
  linkedin_industry_codes: "linkedin",
  naics_codes: "naics",
  nace_sections: "nace",
  isic_sections: "isic",
  sic_divisions: "sic",
  gics_sectors: "gics",
  practical_industry: "practical",
};

function isIndustryCanonical(fieldKey: string): IndustryCodeSystem | null {
  return INDUSTRY_FIELD_TO_SYSTEM[fieldKey] ?? null;
}

async function resolveCanonicalFieldKey(
  repo: IFieldRepository,
  fieldKey: string,
): Promise<{ resolvedKey: string; type: FieldType | null; resolvedViaCanonicalRef: boolean }> {
  const type = await repo.getFieldTypeByKey(fieldKey);
  const ref = resolveEnumValuesCanonicalField(type);
  if (!ref) {
    return { resolvedKey: fieldKey, type, resolvedViaCanonicalRef: false };
  }
  const resolvedType = await repo.getFieldTypeByKey(ref.canonicalFieldKey);
  return { resolvedKey: ref.canonicalFieldKey, type: resolvedType, resolvedViaCanonicalRef: true };
}

async function buildExplainForFromOnly(args: {
  request: TranslateRequest;
  resolvedFromFieldKey: string;
  fromValue: FieldValue | null;
  fromConfidence: number;
}): Promise<ExplainV1> {
  if (!args.fromValue) {
    return emptyExplain(args.request.from_field_key, args.resolvedFromFieldKey);
  }
  const candidate: CandidateSignals = {
    value: args.fromValue,
    signals: [
      makeSignal({
        kind: "exact_value",
        source: "translate.from",
        rawScore: args.fromConfidence,
        weight: DEFAULT_WEIGHTS.exact_value,
        ref: { table: "field_values", id: args.fromValue.id },
      }),
    ],
  };
  const scored = scoreCandidate(candidate);
  const decision = classifyWithPolicy(scored.finalScore, args.request.to_field_key);
  return buildExplain({
    fieldKey: args.request.to_field_key,
    resolvedFieldKey: args.request.to_field_key,
    decision,
    winner: scored,
    alternates: [],
    policyDomain: inferDomain(args.request.to_field_key),
    priorDecisionCount: 0,
    lastDecisionAt: null,
  });
}

export async function translateOne(request: TranslateRequest): Promise<TranslateResponse> {
  const parsed = translateRequestSchema.parse(request);
  const repo = getFieldRepository();

  const fromInference = await runInference(
    {
      fieldKey: parsed.from_field_key,
      value: parsed.value,
      context: parsed.context,
      organizationId: parsed.organization_id,
    },
    repo,
  );
  const fromValue = fromInference.winner?.value ?? null;
  const fromConfidence = fromInference.winner?.finalScore ?? 0;

  const toResolved = await resolveCanonicalFieldKey(repo, parsed.to_field_key);
  const toFieldType = toResolved.type;

  const trace: TranslateResponse["trace"] = {
    from_resolved_via: fromInference.resolvedFieldKey !== parsed.from_field_key ? "canonical_ref" : null,
    from_canonical_field_key:
      fromInference.resolvedFieldKey !== parsed.from_field_key ? fromInference.resolvedFieldKey : undefined,
    to_resolved_via: toResolved.resolvedViaCanonicalRef ? "canonical_ref" : null,
    to_canonical_field_key: toResolved.resolvedViaCanonicalRef ? toResolved.resolvedKey : undefined,
    fallback_used: null,
  };

  const baseFrom = {
    field_key: parsed.from_field_key,
    value_id: fromValue?.id ?? null,
    key: fromValue?.key ?? null,
    label: fromValue?.label ?? null,
    confidence: Number(fromConfidence.toFixed(2)),
  };

  if (!fromValue) {
    return {
      status: "unmatched",
      needs_review: true,
      from: baseFrom,
      candidates: [],
      trace,
      explain: fromInference.explain,
    };
  }

  const candidates: TranslateCandidate[] = [];

  if (toFieldType) {
    const crosswalks = await repo.getCrosswalksByFromValueId(fromValue.id, toFieldType.id);
    for (const crosswalk of crosswalks) {
      const resolved = await repo.resolveCrosswalkTarget(crosswalk);
      if (!resolved) continue;
      const score = Math.min(1, fromConfidence * crosswalk.confidence);
      candidates.push({
        to_value_id: resolved.value.id,
        key: resolved.value.key,
        label: resolved.value.label,
        score,
        via: "crosswalk",
        source: crosswalk.source,
      });
    }
  }

  const fromIndustrySystem = isIndustryCanonical(fromInference.resolvedFieldKey);
  const toIndustrySystem = isIndustryCanonical(toResolved.resolvedKey);
  if (candidates.length === 0 && fromIndustrySystem && toIndustrySystem) {
    const industryCode = String(fromValue.metadata.code ?? fromValue.metadata.codeValue ?? fromValue.key);
    const industryResult = await translateIndustryCode({
      codeSystem: fromIndustrySystem,
      code: industryCode,
      targetSystems: [toIndustrySystem],
    });
    if (industryResult.concept) {
      trace.fallback_used = "concept_graph";
      for (const target of industryResult.targets) {
        const matchingEdge = industryResult.mappings.find(
          (mapping) => mapping.toConceptId === industryResult.concept?.id || mapping.fromConceptId === industryResult.concept?.id,
        );
        const edgeConfidence = matchingEdge?.confidence ?? 0.7;
        const score = Math.min(1, fromConfidence * edgeConfidence);
        candidates.push({
          to_value_id: target.id,
          key: target.code,
          label: target.label,
          score,
          via: "concept_graph",
          source: matchingEdge?.source ?? "industry_concept_edges",
        });
      }
    }
  }

  if (candidates.length === 0 && toFieldType) {
    const toValues = await repo.getValuesByFieldKey(toResolved.resolvedKey);
    const directHit = toValues.find((value) => value.key === fromValue.key);
    if (directHit) {
      candidates.push({
        to_value_id: directHit.id,
        key: directHit.key,
        label: directHit.label,
        score: Math.min(1, fromConfidence),
        via: "exact_value",
        source: "field_values.key",
      });
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  const winnerScore = candidates[0]?.score ?? 0;
  const decision = classifyWithPolicy(winnerScore, toResolved.resolvedKey);

  const explain = candidates.length === 0
    ? await buildExplainForFromOnly({
        request: parsed,
        resolvedFromFieldKey: fromInference.resolvedFieldKey,
        fromValue,
        fromConfidence,
      })
    : buildExplain({
        fieldKey: parsed.to_field_key,
        resolvedFieldKey: toResolved.resolvedKey,
        decision,
        winner: {
          value: {
            id: candidates[0].to_value_id,
            key: candidates[0].key,
            label: candidates[0].label,
            normalizedLabel: candidates[0].label,
            metadata: {},
            fieldTypeId: toFieldType?.id ?? "translate",
            locale: null,
            description: null,
            parentId: null,
            sortOrder: 0,
            status: "active",
            source: candidates[0].source,
            sourceId: null,
          },
          signals: [
            makeSignal({
              kind: candidates[0].via === "concept_graph" ? "concept_graph" : "crosswalk",
              source: candidates[0].source ?? candidates[0].via,
              rawScore: candidates[0].score,
              weight: DEFAULT_WEIGHTS.crosswalk,
              metadata: { via: candidates[0].via },
            }),
          ],
          finalScore: candidates[0].score,
        },
        alternates: candidates.slice(1).map((cand) => ({
          value: {
            id: cand.to_value_id,
            key: cand.key,
            label: cand.label,
            normalizedLabel: cand.label,
            metadata: {},
            fieldTypeId: toFieldType?.id ?? "translate",
            locale: null,
            description: null,
            parentId: null,
            sortOrder: 0,
            status: "active",
            source: cand.source,
            sourceId: null,
          },
          signals: [],
          finalScore: cand.score,
        })),
        policyDomain: inferDomain(toResolved.resolvedKey),
        priorDecisionCount: 0,
        lastDecisionAt: null,
      });

  return {
    status: candidates.length === 0 ? "unmatched" : decision.status,
    needs_review: candidates.length === 0 ? true : decision.needsReview,
    from: baseFrom,
    candidates,
    trace,
    explain,
  };
}

export async function translateBatch(requests: TranslateRequest[]): Promise<TranslateResponse[]> {
  return Promise.all(requests.map((item) => translateOne(item)));
}
