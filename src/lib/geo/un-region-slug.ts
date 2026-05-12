import { normalizeText } from "@/lib/matching/normalize-text";

/** Stable value key for UN statistical region / macro geography labels (matches geo pipeline). */
export function unRegionLabelToValueKey(label: string | null | undefined): string | null {
  if (!label?.trim()) return null;
  return normalizeText(label).replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "").slice(0, 120);
}
