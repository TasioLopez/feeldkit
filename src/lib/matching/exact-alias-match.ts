import { normalizeText } from "@/lib/matching/normalize-text";
import type { FieldValue } from "@/lib/domain/types";
import type { IFieldRepository } from "@/lib/repositories/field-repository.interface";

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
