import type { SeedPack } from "@/data/packs/types";
import type { SeedCrosswalk } from "@/data/seed-crosswalks";
import { unRegionLabelToValueKey } from "@/lib/geo/un-region-slug";

/**
 * Emits `country_in_continent` from `countries` to `geo_continents` using `metadata.un_region_slug`
 * or derived slug from `metadata.region`.
 */
export function buildGeoContinentCrosswalksFromPacks(packs: SeedPack[]): SeedCrosswalk[] {
  const geoPack = packs.find((p) => p.key === "geo");
  const countriesFt = geoPack?.fieldTypes.find((ft) => ft.key === "countries");
  const continentsFt = geoPack?.fieldTypes.find((ft) => ft.key === "geo_continents");
  const continentKeys = new Set((continentsFt?.values ?? []).map((v) => v.key));
  if (!countriesFt?.values.length || !continentKeys.size) {
    return [];
  }

  const out: SeedCrosswalk[] = [];
  const sourceTag = "geo_un_macro_region";

  for (const v of countriesFt.values) {
    const meta = (v.metadata ?? {}) as Record<string, unknown>;
    const slug =
      (typeof meta.un_region_slug === "string" && meta.un_region_slug) ||
      unRegionLabelToValueKey(typeof meta.region === "string" ? meta.region : null);
    if (!slug || !continentKeys.has(slug)) continue;
    out.push({
      fromFieldTypeKey: "countries",
      fromValueKey: v.key,
      toFieldTypeKey: "geo_continents",
      toValueKey: slug,
      crosswalkType: "country_in_continent",
      confidence: 0.96,
      source: sourceTag,
    });
  }

  return out;
}
