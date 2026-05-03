import { validateFieldValue } from "@/lib/validation/validation-service";
import type { FieldValue } from "@/lib/domain/types";
import type { CandidateSignals } from "@/lib/matching/inference/scorer";
import { makeSignal } from "@/lib/matching/inference/signal";
import { DEFAULT_WEIGHTS } from "@/lib/matching/inference/weights";

const VALIDATOR_CONFIDENCE = 0.72;

function buildPlaceholderValue(input: string, normalized?: string): FieldValue {
  return {
    id: crypto.randomUUID(),
    fieldTypeId: "validation-only",
    key: normalized ?? input,
    label: normalized ?? input,
    normalizedLabel: normalized ?? input,
    locale: null,
    description: null,
    parentId: null,
    sortOrder: 0,
    status: "active",
    metadata: { validated: true },
    source: "runtime",
    sourceId: null,
  };
}

export function validationMatch(
  fieldKey: string,
  input: string,
  context?: Record<string, unknown>,
): { value: FieldValue; confidence: number } | null {
  if (fieldKey !== "postal_codes") {
    return null;
  }
  const result = validateFieldValue({
    field_key: fieldKey,
    value: input,
    context,
  });
  if (!result.valid) {
    return null;
  }
  return { value: buildPlaceholderValue(input, result.normalizedValue), confidence: VALIDATOR_CONFIDENCE };
}

export function validationMatchWithSignals(
  fieldKey: string,
  input: string,
  context?: Record<string, unknown>,
): CandidateSignals[] {
  const match = validationMatch(fieldKey, input, context);
  if (!match) return [];
  return [
    {
      value: match.value,
      signals: [
        makeSignal({
          kind: "validator",
          source: "validation-service",
          rawScore: VALIDATOR_CONFIDENCE,
          weight: DEFAULT_WEIGHTS.validator,
          metadata: { field_key: fieldKey },
        }),
      ],
    },
  ];
}
