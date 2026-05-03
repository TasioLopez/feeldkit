import { z } from "zod";
import { normalizeText } from "@/lib/matching/normalize-text";
import { enqueueReview } from "@/lib/matching/review-queue";
import { getFieldRepository } from "@/lib/repositories/get-field-repository";
import { runInference } from "@/lib/matching/inference/engine";
import type { ExplainV1 } from "@/lib/matching/inference/explain";

export const normalizeRequestSchema = z.object({
  field_key: z.string(),
  value: z.string(),
  context: z.record(z.string(), z.unknown()).optional(),
  organization_id: z.string().optional(),
});

type NormalizeMatch = {
  id: string;
  key: string;
  label: string;
  metadata: Record<string, unknown>;
} | null;

export type NormalizeResponse = {
  field_key: string;
  input: string;
  normalized_input: string;
  status: string;
  confidence: number;
  needs_review: boolean;
  review_id?: string;
  match: NormalizeMatch;
  trace: {
    resolved_via: "canonical_ref" | null;
    consumer_field_key?: string;
    canonical_field_key?: string;
    prior_decision_count: number;
  };
  explain: ExplainV1;
};

export async function normalizeOne(request: z.infer<typeof normalizeRequestSchema>): Promise<NormalizeResponse> {
  const repo = getFieldRepository();
  const inference = await runInference(
    {
      fieldKey: request.field_key,
      value: request.value,
      context: request.context,
      organizationId: request.organization_id,
    },
    repo,
  );
  const normalizedInput = inference.normalizedInput || normalizeText(request.value);
  const resolvedViaCanonicalRef = inference.resolvedFieldKey !== request.field_key;
  const fieldTypeId =
    (inference.resolvedFieldType ?? inference.consumerFieldType)?.id ?? null;

  const baseTrace: NormalizeResponse["trace"] = {
    resolved_via: resolvedViaCanonicalRef ? "canonical_ref" : null,
    consumer_field_key: resolvedViaCanonicalRef ? request.field_key : undefined,
    canonical_field_key: resolvedViaCanonicalRef ? inference.resolvedFieldKey : undefined,
    prior_decision_count: inference.priorDecisionCount,
  };

  if (!inference.winner) {
    const review = await enqueueReview({
      organizationId: request.organization_id ?? null,
      fieldTypeId,
      fieldKey: request.field_key,
      input: request.value,
      normalizedInput,
      confidence: 0,
      status: "pending",
      suggestedValueId: null,
      selectedValueId: null,
      reviewedAt: null,
      notes: null,
      explainPayload: inference.explain as unknown as Record<string, unknown>,
    });
    return {
      field_key: request.field_key,
      input: request.value,
      normalized_input: normalizedInput,
      status: "unmatched",
      confidence: 0,
      needs_review: true,
      review_id: review.id,
      match: null,
      trace: baseTrace,
      explain: inference.explain,
    };
  }

  if (inference.decision.needsReview) {
    await enqueueReview({
      organizationId: request.organization_id ?? null,
      fieldTypeId,
      fieldKey: request.field_key,
      input: request.value,
      normalizedInput,
      confidence: inference.winner.finalScore,
      status: "pending",
      suggestedValueId: inference.winner.value.id,
      selectedValueId: null,
      reviewedAt: null,
      notes: null,
      explainPayload: inference.explain as unknown as Record<string, unknown>,
    });
  }

  return {
    field_key: request.field_key,
    input: request.value,
    normalized_input: normalizedInput,
    status: inference.decision.status,
    confidence: Number(inference.winner.finalScore.toFixed(2)),
    needs_review: inference.decision.needsReview,
    match: {
      id: inference.winner.value.id,
      key: inference.winner.value.key,
      label: inference.winner.value.label,
      metadata: inference.winner.value.metadata,
    },
    trace: baseTrace,
    explain: inference.explain,
  };
}

export async function normalizeBatch(requests: z.infer<typeof normalizeRequestSchema>[]) {
  return Promise.all(requests.map((item) => normalizeOne(item)));
}
