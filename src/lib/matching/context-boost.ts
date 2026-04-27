import type { FieldValue } from "@/lib/domain/types";

export function contextBoost(
  fieldKey: string,
  candidate: { value: FieldValue; confidence: number },
  context?: Record<string, unknown>,
): { value: FieldValue; confidence: number } {
  if (!context) {
    return candidate;
  }

  let bonus = 0;
  if (fieldKey === "subdivisions" && typeof context.country === "string") {
    const countryIso2 = String(candidate.value.metadata.country_iso2 ?? "").toUpperCase();
    if (countryIso2 && countryIso2 === String(context.country).toUpperCase()) {
      bonus += 0.08;
    }
  }

  if (fieldKey === "languages" && typeof context.country === "string") {
    if (String(context.country).toUpperCase() === "NL" && candidate.value.key === "nl") {
      bonus += 0.05;
    }
  }

  return { ...candidate, confidence: Math.min(1, candidate.confidence + bonus) };
}
