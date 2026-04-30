import type { SeedPack } from "@/data/packs/types";
import type { SeedCrosswalk } from "@/data/seed-crosswalks";
import countryIso2Defaults from "@/data/country-iso2-defaults.json";
import { ianaTimezoneValueKey } from "@/lib/geo/iana-timezone-key";

type DefaultsRow = { currency: string | null; language_iso639_3: string | null; timezone: string | null };

const defaults = countryIso2Defaults as Record<string, DefaultsRow>;

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
 * using `src/data/country-iso2-defaults.json` (derived from ISO / mledoze countries dataset).
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
    const row = defaults[iso2];
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

    const lang = iso639_3ToBcp47(row.language_iso639_3);
    if (lang) {
      out.push({
        fromFieldTypeKey: "countries",
        fromValueKey: v.key,
        toFieldTypeKey: "languages",
        toValueKey: lang,
        crosswalkType: "country_official_language",
        confidence: 0.93,
        source: sourceTag,
      });
    }

    if (row.timezone) {
      out.push({
        fromFieldTypeKey: "countries",
        fromValueKey: v.key,
        toFieldTypeKey: "timezones",
        toValueKey: ianaTimezoneValueKey(row.timezone),
        crosswalkType: "country_default_timezone",
        confidence: 0.88,
        source: sourceTag,
      });
    }
  }

  return out;
}
