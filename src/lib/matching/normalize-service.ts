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
import { resolveEnumValuesCanonicalField } from "@/lib/matching/field-reference-resolver";

export const normalizeRequestSchema = z.object({
  field_key: z.string(),
  value: z.string(),
  context: z.record(z.string(), z.unknown()).optional(),
  organization_id: z.string().optional(),
});

export async function normalizeOne(request: z.infer<typeof normalizeRequestSchema>) {
  const repo = getFieldRepository();
  const normalizedInput = normalizeText(request.value);
  const consumerFieldType = await repo.getFieldTypeByKey(request.field_key);
  const resolved = resolveEnumValuesCanonicalField(consumerFieldType);
  const matchFieldKey = resolved?.canonicalFieldKey ?? request.field_key;
  const fieldType = consumerFieldType;
  const fieldTypeId = fieldType?.id ?? null;
  const candidates = (
    await Promise.all([
      exactAliasMatch(repo, matchFieldKey, request.value, request.context),
      exactValueMatch(repo, matchFieldKey, request.value),
      metadataCodeMatch(repo, matchFieldKey, request.value),
      Promise.resolve(validationMatch(matchFieldKey, request.value, request.context)),
      Promise.resolve(parserMatch(matchFieldKey, request.value, request.context)),
      fuzzyMatch(repo, matchFieldKey, request.value),
    ])
  ).filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate));

  const top = candidates
    .map((candidate) => contextBoost(matchFieldKey, candidate, request.context))
    .sort((a, b) => b.confidence - a.confidence)[0];

  if (!top) {
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
      trace: {
        resolved_via: resolved ? ("canonical_ref" as const) : null,
        consumer_field_key: resolved ? request.field_key : undefined,
        canonical_field_key: resolved ? matchFieldKey : undefined,
      },
    };
  }

  const confidence = classifyConfidence(top.confidence);
  if (confidence.needsReview) {
    await enqueueReview({
      organizationId: request.organization_id ?? null,
      fieldTypeId,
      fieldKey: request.field_key,
      input: request.value,
      normalizedInput,
      confidence: top.confidence,
      status: "pending",
      suggestedValueId: top.value.id,
      selectedValueId: null,
      reviewedAt: null,
      notes: null,
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
    trace: {
      resolved_via: resolved ? ("canonical_ref" as const) : null,
      consumer_field_key: resolved ? request.field_key : undefined,
      canonical_field_key: resolved ? matchFieldKey : undefined,
    },
  };
}

export async function normalizeBatch(requests: z.infer<typeof normalizeRequestSchema>[]) {
  return Promise.all(requests.map((item) => normalizeOne(item)));
}
