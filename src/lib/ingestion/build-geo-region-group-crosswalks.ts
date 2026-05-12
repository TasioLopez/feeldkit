import type { SeedCrosswalk } from "@/data/seed-crosswalks";
import regionGroupMemberships from "@/data/packs/geo/region-group-memberships.json";

type MembershipFile = Record<string, { group_kind?: string; iso2: string[] }>;

const memberships = regionGroupMemberships as MembershipFile;

/**
 * Emits `country_in_region_group` crosswalks from curated ISO2 lists.
 * Country value keys must be lowercase ISO-3166-1 alpha-2 (e.g. `nl`).
 */
export function buildGeoRegionGroupCrosswalksFromPacks(): SeedCrosswalk[] {
  const out: SeedCrosswalk[] = [];
  const sourceTag = "geo_region_group_memberships";

  for (const [groupKey, entry] of Object.entries(memberships)) {
    const confidence = entry.group_kind === "legal_treaty" ? 0.99 : entry.group_kind === "informal" ? 0.9 : 0.95;
    for (const iso of entry.iso2) {
      const iso2 = iso.trim().toUpperCase();
      if (iso2.length !== 2) continue;
      out.push({
        fromFieldTypeKey: "countries",
        fromValueKey: iso2.toLowerCase(),
        toFieldTypeKey: "geo_region_groups",
        toValueKey: groupKey,
        crosswalkType: "country_in_region_group",
        confidence,
        source: sourceTag,
      });
    }
  }

  return out;
}
