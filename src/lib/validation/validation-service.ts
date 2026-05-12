import { z } from "zod";
import { POSTAL_PATTERN_SOURCE } from "@/data/generated/postal-patterns";
import type { ValidationResult } from "@/lib/domain/types";

function postalRegexFor(country: string): RegExp | null {
  const pattern = POSTAL_PATTERN_SOURCE[country];
  if (!pattern) return null;
  try {
    return new RegExp(pattern, "i");
  } catch {
    return null;
  }
}

const socialLinkedInRegex = /^https:\/\/(www\.)?linkedin\.com\/(in|company)\/[a-zA-Z0-9-_%]+\/?$/;
const utmKeyRegex = /^utm_(source|medium|campaign|term|content)$/;

export const validatePayloadSchema = z.object({
  field_key: z.string(),
  value: z.string(),
  context: z.record(z.string(), z.unknown()).optional(),
});

export function validateFieldValue(input: z.infer<typeof validatePayloadSchema>): ValidationResult {
  const { field_key, value, context } = input;
  const errors: string[] = [];

  if (field_key === "postal_codes") {
    const country = String(context?.country ?? "").toUpperCase();
    const rx = country ? postalRegexFor(country) : null;
    if (!country) {
      errors.push("country context is required for postal_codes");
    } else if (!rx) {
      errors.push(`postal format not configured for ${country}`);
    } else if (!rx.test(value.trim())) {
      errors.push(`postal code does not match ${country} format`);
    }
  }

  if (field_key === "social_urls") {
    if (!socialLinkedInRegex.test(value.trim())) {
      errors.push("invalid supported social URL format");
    }
  }

  if (field_key === "utm_parameters") {
    const params = new URLSearchParams(value.startsWith("?") ? value.slice(1) : value);
    for (const key of params.keys()) {
      if (!utmKeyRegex.test(key)) {
        errors.push(`unexpected UTM key: ${key}`);
      }
    }
    if (!params.has("utm_source") || !params.has("utm_medium")) {
      errors.push("utm_source and utm_medium are required");
    }
  }

  return {
    fieldKey: field_key,
    valid: errors.length === 0,
    errors,
    normalizedValue: value.trim(),
  };
}
