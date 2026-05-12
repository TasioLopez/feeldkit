import type { SeedValue } from "../../src/data/packs/types";
import { toDeterministicKey } from "./utils";

export function countryValueKeyFromIso2(iso2: string): string {
  return iso2.trim().toUpperCase().toLowerCase();
}

/** Merge country rows by ISO2; later overlays extend aliases/metadata. */
export function mergeCountryValuesByIso2(base: SeedValue[], overlays: SeedValue[]): SeedValue[] {
  const map = new Map<string, SeedValue>();
  for (const v of base) {
    const iso = String(v.metadata?.iso2 ?? "").toUpperCase();
    if (iso.length !== 2) continue;
    const key = countryValueKeyFromIso2(iso);
    map.set(iso, { ...v, key });
  }
  for (const o of overlays) {
    const iso = String(o.metadata?.iso2 ?? "").toUpperCase();
    if (iso.length !== 2) continue;
    const key = countryValueKeyFromIso2(iso);
    const existing = map.get(iso);
    if (!existing) {
      map.set(iso, { ...o, key });
      continue;
    }
    const aliases = new Set<string>([...(existing.aliases ?? []), ...(o.aliases ?? []), existing.label, o.label].filter(Boolean));
    map.set(iso, {
      ...existing,
      key,
      label: existing.label?.trim() || o.label?.trim() || existing.label,
      aliases: [...aliases],
      metadata: {
        ...existing.metadata,
        ...o.metadata,
        source_overlay: o.metadata?.source_overlay ?? existing.metadata?.source_overlay,
      },
    });
  }
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
}

export function subdivisionValueKeyFromIso3166_2(code: string): string {
  return code.trim().toUpperCase().replace(/-/g, "_").toLowerCase();
}

/** Merge subdivision rows by iso3166_2; overlay rows add aliases. Official import wins label unless overlay has source_overlay. */
export function mergeSubdivisionValuesByIso3166_2(base: SeedValue[], overlays: SeedValue[]): SeedValue[] {
  const map = new Map<string, SeedValue>();
  for (const v of base) {
    const code = String(v.metadata?.iso3166_2 ?? "").toUpperCase();
    if (!code.includes("-")) continue;
    const key = subdivisionValueKeyFromIso3166_2(code);
    map.set(code, { ...v, key });
  }
  for (const o of overlays) {
    const code = String(o.metadata?.iso3166_2 ?? "").toUpperCase();
    if (!code.includes("-")) continue;
    const key = subdivisionValueKeyFromIso3166_2(code);
    const existing = map.get(code);
    if (!existing) {
      map.set(code, { ...o, key });
      continue;
    }
    const aliases = new Set<string>([...(existing.aliases ?? []), ...(o.aliases ?? []), existing.label, o.label].filter(Boolean));
    map.set(code, {
      ...existing,
      key,
      label: o.metadata?.source_overlay != null ? o.label : existing.label,
      aliases: [...aliases],
      metadata: {
        ...existing.metadata,
        ...o.metadata,
        source_overlay: o.metadata?.source_overlay ?? existing.metadata?.source_overlay,
      },
    });
  }
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
}

export function unRegionSlug(label: string | null | undefined): string | null {
  if (!label?.trim()) return null;
  return toDeterministicKey(label);
}
