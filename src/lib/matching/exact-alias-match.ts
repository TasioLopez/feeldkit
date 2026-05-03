import { normalizeText } from "@/lib/matching/normalize-text";
import type { FieldValue } from "@/lib/domain/types";
import type { IFieldRepository } from "@/lib/repositories/field-repository.interface";
import type { CandidateSignals } from "@/lib/matching/inference/scorer";
import { makeSignal } from "@/lib/matching/inference/signal";
import { DEFAULT_WEIGHTS } from "@/lib/matching/inference/weights";

function preferredLocale(context?: Record<string, unknown>): string | null {
  if (!context) return null;
  const display = context.display_language;
  if (typeof display === "string" && display.trim()) return display.trim();
  const source = context.source_locale;
  if (typeof source === "string" && source.trim()) {
    try {
      return new Intl.Locale(source.trim()).language;
    } catch {
      return source.trim();
    }
  }
  const target = context.target_locale;
  if (typeof target === "string" && target.trim()) {
    try {
      return new Intl.Locale(target.trim()).language;
    } catch {
      return target.trim();
    }
  }
  return null;
}

function aliasSourceTrust(source: string | null): number {
  if (!source) return 0;
  switch (source) {
    case "review_approval":
      return 1;
    case "ai_proposal":
      return 0.6;
    case "manual":
      return 0.9;
    case "import":
      return 0.7;
    default:
      return 0.5;
  }
}

export async function exactAliasMatch(
  repo: IFieldRepository,
  fieldKey: string,
  input: string,
  context?: Record<string, unknown>,
): Promise<{ value: FieldValue; confidence: number } | null> {
  const type = await repo.getFieldTypeByKey(fieldKey);
  if (!type) {
    return null;
  }
  const normalized = normalizeText(input);
  const aliases = await repo.getAliasesForType(type.id);
  const hits = aliases.filter((entry) => entry.normalizedAlias === normalized);
  if (!hits.length) {
    return null;
  }
  const locale = preferredLocale(context);
  const ranked = [...hits].sort((a, b) => {
    if (!locale) return 0;
    const aMatch = a.locale && a.locale.split("-")[0] === locale ? 1 : 0;
    const bMatch = b.locale && b.locale.split("-")[0] === locale ? 1 : 0;
    if (aMatch !== bMatch) return bMatch - aMatch;
    const aWild = a.locale ? 1 : 0;
    const bWild = b.locale ? 1 : 0;
    return aWild - bWild;
  });
  const hit = ranked[0];
  const values = await repo.getValuesByFieldKey(fieldKey);
  const value = values.find((entry) => entry.id === hit.fieldValueId);
  if (!value) {
    return null;
  }
  return { value, confidence: Math.min(0.99, hit.confidence) };
}

/**
 * Inference-friendly variant: returns one or more candidate value rows with explicit signals
 * (exact_alias, locale_preference, alias_source_trust). Multiple alias hits can map to the same value;
 * the engine merges signals at the value-id level.
 */
export async function exactAliasMatchWithSignals(
  repo: IFieldRepository,
  fieldKey: string,
  input: string,
  context?: Record<string, unknown>,
): Promise<CandidateSignals[]> {
  const type = await repo.getFieldTypeByKey(fieldKey);
  if (!type) return [];
  const normalized = normalizeText(input);
  if (!normalized) return [];
  const aliases = await repo.getAliasesForType(type.id);
  const hits = aliases.filter((entry) => entry.normalizedAlias === normalized);
  if (!hits.length) return [];
  const locale = preferredLocale(context);
  const values = await repo.getValuesByFieldKey(fieldKey);
  const valueById = new Map(values.map((value) => [value.id, value]));
  const seen = new Map<string, CandidateSignals>();
  for (const hit of hits) {
    const value = valueById.get(hit.fieldValueId);
    if (!value) continue;
    const existing = seen.get(value.id) ?? { value, signals: [] };
    const aliasScore = Math.min(0.99, hit.confidence);
    existing.signals.push(
      makeSignal({
        kind: "exact_alias",
        source: "field_aliases",
        rawScore: aliasScore,
        weight: DEFAULT_WEIGHTS.exact_alias,
        ref: { table: "field_aliases", id: hit.id },
        metadata: { locale: hit.locale, alias_source: hit.source },
      }),
    );
    if (locale && hit.locale && hit.locale.split("-")[0] === locale) {
      existing.signals.push(
        makeSignal({
          kind: "locale_preference",
          source: "context.display_language",
          rawScore: 1,
          weight: DEFAULT_WEIGHTS.locale_preference,
          metadata: { matched_locale: hit.locale, requested_locale: locale },
        }),
      );
    }
    const trust = aliasSourceTrust(hit.source);
    if (trust > 0) {
      existing.signals.push(
        makeSignal({
          kind: "alias_source_trust",
          source: hit.source ?? "unknown",
          rawScore: trust,
          weight: DEFAULT_WEIGHTS.alias_source_trust,
          metadata: { alias_id: hit.id },
        }),
      );
    }
    seen.set(value.id, existing);
  }
  return Array.from(seen.values());
}
