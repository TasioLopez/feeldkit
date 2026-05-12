import type { SeedPack } from "@/data/packs/types";
import type { SeedCrosswalk } from "@/data/seed-crosswalks";
import dialByIso2 from "@/data/packs/standards/e164-dial-by-iso2.json";
import { callingCodeValueKeyFromDial } from "@/lib/geo/e164-calling-code-key";

const dialMap = dialByIso2 as Record<string, string>;

/**
 * Emits `country_uses_calling_code` from `countries` to `e164_country_calling_codes`.
 * Requires merged packs that include `standards_telephony` with prefix values.
 */
export function buildCallingCodeCrosswalksFromPacks(packs: SeedPack[]): SeedCrosswalk[] {
  const geoPack = packs.find((p) => p.key === "geo");
  const countriesFt = geoPack?.fieldTypes.find((ft) => ft.key === "countries");
  const telephonyPack = packs.find((p) => p.key === "standards_telephony");
  const dialFt = telephonyPack?.fieldTypes.find((ft) => ft.key === "e164_country_calling_codes");
  const dialKeys = new Set((dialFt?.values ?? []).map((v) => v.key));
  if (!countriesFt?.values.length || !dialKeys.size) {
    return [];
  }

  const out: SeedCrosswalk[] = [];
  const sourceTag = "datasets_country_codes_dial";

  for (const v of countriesFt.values) {
    const iso2 = String((v.metadata as Record<string, unknown> | undefined)?.iso2 ?? "")
      .trim()
      .toUpperCase();
    if (iso2.length !== 2) continue;
    const dial = dialMap[iso2];
    if (!dial) continue;
    const toKey = callingCodeValueKeyFromDial(dial);
    if (!dialKeys.has(toKey)) continue;
    out.push({
      fromFieldTypeKey: "countries",
      fromValueKey: v.key,
      toFieldTypeKey: "e164_country_calling_codes",
      toValueKey: toKey,
      crosswalkType: "country_uses_calling_code",
      confidence: 0.94,
      source: sourceTag,
    });
  }

  return out;
}
