import { validateFieldValue } from "@/lib/validation/validation-service";
import type { FieldValue } from "@/lib/domain/types";

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
  return {
    // Validation-only fields can still return a typed placeholder.
    value: {
      id: crypto.randomUUID(),
      fieldTypeId: "validation-only",
      key: result.normalizedValue ?? input,
      label: result.normalizedValue ?? input,
      normalizedLabel: result.normalizedValue ?? input,
      locale: null,
      description: null,
      parentId: null,
      sortOrder: 0,
      status: "active",
      metadata: { validated: true },
      source: "runtime",
      sourceId: null,
    },
    confidence: 0.72,
  };
}
