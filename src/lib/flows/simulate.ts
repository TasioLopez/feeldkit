import { z } from "zod";
import type {
  FlowFieldOutput,
  FlowSimulationCase,
  FlowSimulationCaseAssertions,
  FlowSimulationCaseResult,
  FlowSimulationResponse,
  FlowTranslateResponse,
} from "@/lib/api/types";
import { runFlow } from "@/lib/flows/run-flow";

export const simulationProfileSchema = z.object({
  schema: z.literal("feeldkit.simulation_profile.v1"),
  flow_key: z.string().min(1),
  version: z.string().optional(),
  organization_id: z.string().optional(),
  context: z.record(z.string(), z.unknown()).optional(),
  cases: z
    .array(
      z.object({
        name: z.string().min(1),
        source_record: z.record(z.string(), z.unknown()),
        expected: z
          .object({
            matched_targets: z.array(z.string()).optional(),
            unmapped_targets: z.array(z.string()).optional(),
            skipped_targets: z.array(z.string()).optional(),
            status: z.enum(["ok", "incomplete", "not_found"]).optional(),
          })
          .optional(),
      }),
    )
    .min(1),
});

export type ParsedSimulationProfile = z.infer<typeof simulationProfileSchema>;

/**
 * Phase 6: dry-run a flow pack against an array of source_records. The
 * response per case is identical to `/api/v1/flow/translate` plus an assertion
 * report. No `mapping_reviews` rows are persisted (the engine never writes
 * reviews; this entry-point only invokes it).
 */
export async function simulateFlow(profile: ParsedSimulationProfile): Promise<FlowSimulationResponse> {
  const cases: FlowSimulationCaseResult[] = [];
  let flowVersionId: string | null = null;
  let resolvedFlowVersion = profile.version ?? "unknown";
  let resolvedFlowKey = profile.flow_key;

  for (const c of profile.cases) {
    const result: FlowTranslateResponse = await runFlow({
      flow_key: profile.flow_key,
      source_record: c.source_record,
      version: profile.version,
      context: profile.context,
      organization_id: profile.organization_id,
    });
    if (result.trace.flow_pack_version_id) flowVersionId = result.trace.flow_pack_version_id;
    if (result.flow.version) resolvedFlowVersion = result.flow.version;
    if (result.flow.key) resolvedFlowKey = result.flow.key;
    cases.push(buildCaseResult(c, result));
  }

  const passed = cases.filter((c) => c.passed).length;

  return {
    flow: { key: resolvedFlowKey, version: resolvedFlowVersion },
    total_cases: cases.length,
    passed_cases: passed,
    cases,
    trace: {
      engine_version: "1",
      deterministic_only: true,
      flow_pack_version_id: flowVersionId,
      dry_run: true,
      persisted_review_count: 0,
    },
  };
}

function buildCaseResult(c: FlowSimulationCase, result: FlowTranslateResponse): FlowSimulationCaseResult {
  const failures = c.expected ? assertExpectations(c.expected, result) : [];
  const wouldBeReviews = result.fields.filter(
    (f) =>
      f.status === "unmapped" ||
      (f.status === "unmatched" && f.is_required) ||
      (f.explain && f.explain.decision.needs_review),
  ).length;
  return {
    name: c.name,
    status: result.status,
    fields: result.fields,
    unmapped: result.unmapped,
    passed: failures.length === 0,
    failures,
    would_be_reviews: wouldBeReviews,
  };
}

function assertExpectations(
  expected: FlowSimulationCaseAssertions,
  result: FlowTranslateResponse,
): string[] {
  const failures: string[] = [];
  if (expected.status && expected.status !== result.status) {
    failures.push(`expected status=${expected.status} but got status=${result.status}`);
  }
  for (const target of expected.matched_targets ?? []) {
    const field = result.fields.find((f) => f.target_field_key === target);
    if (!field) failures.push(`expected matched target ${target} not found in fields`);
    else if (field.status !== "matched")
      failures.push(`expected matched target ${target} but got status=${field.status}`);
  }
  for (const target of expected.unmapped_targets ?? []) {
    const field = result.fields.find((f) => f.target_field_key === target);
    if (!field) failures.push(`expected unmapped target ${target} not found in fields`);
    else if (!isUnmapped(field))
      failures.push(`expected unmapped target ${target} but got status=${field.status}`);
  }
  for (const target of expected.skipped_targets ?? []) {
    const field = result.fields.find((f) => f.target_field_key === target);
    if (!field) failures.push(`expected skipped target ${target} not found in fields`);
    else if (field.status !== "skipped")
      failures.push(`expected skipped target ${target} but got status=${field.status}`);
  }
  return failures;
}

function isUnmapped(field: FlowFieldOutput): boolean {
  return field.status === "unmapped" || (field.status === "unmatched" && field.is_required);
}
