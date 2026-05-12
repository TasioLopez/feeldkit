import type { SeedPack } from "@/data/packs/types";
import type { SeedCrosswalk } from "@/data/seed-crosswalks";
import { loadCountryDefaultsV2 } from "@/lib/ingestion/country-defaults-data";
import { ianaTimezoneValueKey } from "@/lib/geo/iana-timezone-key";

const countriesMap = loadCountryDefaultsV2();

function iso639_3ToBcp47(code: string | null): string | null {
  if (!code) return null;
  try {
    return new Intl.Locale(code).language;
  } catch {
    return null;
  }
}

/**
 * Deterministic crosswalks from `geo.countries` values to standards modules,
 * using `src/data/country-iso2-defaults.json` (v2: multiple languages/timezones with `primary`).
 */
export function buildCountryStandardsCrosswalksFromPacks(packs: SeedPack[]): SeedCrosswalk[] {
  const geoPack = packs.find((p) => p.key === "geo");
  const countriesFt = geoPack?.fieldTypes.find((ft) => ft.key === "countries");
  if (!countriesFt?.values.length) {
    return [];
  }

  const out: SeedCrosswalk[] = [];
  const sourceTag = "country_iso2_defaults";

  for (const v of countriesFt.values) {
    const iso2 = (v.metadata?.iso2 as string | undefined)?.toUpperCase();
    if (!iso2 || iso2.length !== 2) continue;
    const row = countriesMap[iso2];
    if (!row) continue;

    if (row.currency) {
      const curKey = row.currency.toLowerCase();
      out.push({
        fromFieldTypeKey: "countries",
        fromValueKey: v.key,
        toFieldTypeKey: "currencies",
        toValueKey: curKey,
        crosswalkType: "country_default_currency",
        confidence: 0.97,
        source: sourceTag,
      });
    }

    for (const lang of row.languages ?? []) {
      const bcp = iso639_3ToBcp47(lang.iso639_3);
      if (!bcp) continue;
      out.push({
        fromFieldTypeKey: "countries",
        fromValueKey: v.key,
        toFieldTypeKey: "languages",
        toValueKey: bcp,
        crosswalkType: "country_official_language",
        confidence: 0.93,
        source: sourceTag,
        metadata: { primary: Boolean(lang.primary) },
      });
    }

    for (const tz of row.timezones ?? []) {
      if (!tz.iana) continue;
      out.push({
        fromFieldTypeKey: "countries",
        fromValueKey: v.key,
        toFieldTypeKey: "timezones",
        toValueKey: ianaTimezoneValueKey(tz.iana),
        crosswalkType: "country_default_timezone",
        confidence: 0.88,
        source: sourceTag,
        metadata: { primary: Boolean(tz.primary) },
      });
    }
  }

  return out;
}
