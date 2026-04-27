import { z } from "zod";
import { normalizeText } from "@/lib/matching/normalize-text";
import { exactAliasMatch } from "@/lib/matching/exact-alias-match";
import { exactValueMatch } from "@/lib/matching/exact-value-match";
import { metadataCodeMatch } from "@/lib/matching/metadata-code-match";
import { fuzzyMatch } from "@/lib/matching/fuzzy-match";
import { validationMatch } from "@/lib/matching/validation-match";
import { parserMatch } from "@/lib/matching/parser-match";
import { contextBoost } from "@/lib/matching/context-boost";
import { classifyConfidence } from "@/lib/matching/confidence";
import { enqueueReview } from "@/lib/matching/review-queue";
import { getFieldRepository } from "@/lib/repositories/get-field-repository";

export const normalizeRequestSchema = z.object({
  field_key: z.string(),
  value: z.string(),
  context: z.record(z.string(), z.unknown()).optional(),
  organization_id: z.string().optional(),
});

export async function normalizeOne(request: z.infer<typeof normalizeRequestSchema>) {
  const repo = getFieldRepository();
  const normalizedInput = normalizeText(request.value);
  const candidates = (
    await Promise.all([
      exactAliasMatch(repo, request.field_key, request.value),
      exactValueMatch(repo, request.field_key, request.value),
      metadataCodeMatch(repo, request.field_key, request.value),
      Promise.resolve(validationMatch(request.field_key, request.value, request.context)),
      Promise.resolve(parserMatch(request.field_key, request.value, request.context)),
      fuzzyMatch(repo, request.field_key, request.value),
    ])
  ).filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate));

  const top = candidates
    .map((candidate) => contextBoost(request.field_key, candidate, request.context))
    .sort((a, b) => b.confidence - a.confidence)[0];

  if (!top) {
    const review = enqueueReview({
      fieldKey: request.field_key,
      input: request.value,
      normalizedInput,
      confidence: 0,
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
    };
  }

  const confidence = classifyConfidence(top.confidence);
  if (confidence.needsReview) {
    enqueueReview({
      fieldKey: request.field_key,
      input: request.value,
      normalizedInput,
      confidence: top.confidence,
    });
  }

  return {
    field_key: request.field_key,
    input: request.value,
    normalized_input: normalizedInput,
    status: confidence.status,
    confidence: Number(top.confidence.toFixed(2)),
    needs_review: confidence.needsReview,
    match: {
      id: top.value.id,
      key: top.value.key,
      label: top.value.label,
      metadata: top.value.metadata,
    },
  };
}

export async function normalizeBatch(requests: z.infer<typeof normalizeRequestSchema>[]) {
  return Promise.all(requests.map((item) => normalizeOne(item)));
}
