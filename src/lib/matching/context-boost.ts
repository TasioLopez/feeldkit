import type { FieldValue } from "@/lib/domain/types";
import type { Signal } from "@/lib/matching/inference/signal";
import { makeSignal } from "@/lib/matching/inference/signal";
import { DEFAULT_WEIGHTS } from "@/lib/matching/inference/weights";

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

/**
 * Emit context_country / context_locale signals for a candidate. Used by the inference engine.
 * Mirrors the heuristics in `contextBoost` but exposes them as explainable signals.
 */
export function contextSignalsFor(
  fieldKey: string,
  value: FieldValue,
  context?: Record<string, unknown>,
): Signal[] {
  if (!context) return [];
  const signals: Signal[] = [];
  if (fieldKey === "subdivisions" && typeof context.country === "string") {
    const countryIso2 = String(value.metadata.country_iso2 ?? "").toUpperCase();
    if (countryIso2 && countryIso2 === String(context.country).toUpperCase()) {
      signals.push(
        makeSignal({
          kind: "context_country",
          source: "context.country",
          rawScore: 1,
          weight: DEFAULT_WEIGHTS.context_country,
          metadata: { country: countryIso2 },
        }),
      );
    }
  }
  if (fieldKey === "languages" && typeof context.country === "string") {
    if (String(context.country).toUpperCase() === "NL" && value.key === "nl") {
      signals.push(
        makeSignal({
          kind: "context_locale",
          source: "context.country",
          rawScore: 1,
          weight: DEFAULT_WEIGHTS.context_locale,
          metadata: { country: "NL", language: "nl" },
        }),
      );
    }
  }
  return signals;
}
