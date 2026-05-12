import type { SeedPack } from "../../src/data/packs/types";
import { currenciesSeed } from "../../src/data/packs/standards/currencies.seed";
import { buildE164CallingCodeSeedValues } from "../../src/lib/geo/telephony-seed-values";
import { languagesSeed } from "../../src/data/packs/standards/languages.seed";
import { timezonesSeed } from "../../src/data/packs/standards/timezones.seed";
import countryIso2Defaults from "../../src/data/country-iso2-defaults.json";
import { ianaTimezoneValueKey } from "../../src/lib/geo/iana-timezone-key";
import type { SourceAdapter } from "./types";
import { uniqueByKey, validateSeedValues } from "./utils";

const FALLBACK_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "CAD",
  "AUD",
  "CHF",
  "SEK",
  "NOK",
  "DKK",
];

const FALLBACK_LANGUAGE_CODES = [
  "en",
  "fr",
  "de",
  "es",
  "it",
  "pt",
  "nl",
  "sv",
  "pl",
  "tr",
  "ja",
  "ko",
  "zh",
  "ar",
  "ru",
  "hi",
  "id",
  "ms",
  "th",
  "vi",
] as const;

type CountryDefaultsV2Row = {
  currency: string | null;
  languages: Array<{ iso639_3: string; primary: boolean }>;
  timezones: Array<{ iana: string; primary: boolean }>;
};

type CountryDefaultsFile = { version: 2; countries: Record<string, CountryDefaultsV2Row> };

function loadDefaultsCountries(): Record<string, CountryDefaultsV2Row> {
  const root = countryIso2Defaults as unknown as CountryDefaultsFile;
  if (root?.version !== 2 || !root.countries) {
    throw new Error("country-iso2-defaults.json must be version 2 with `countries` map");
  }
  return root.countries;
}

function getSupportedValues(kind: "timeZone" | "currency"): string[] {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const values = (Intl as any).supportedValuesOf?.(kind);
    return Array.isArray(values) ? values : [];
  } catch {
    return [];
  }
}

function iso639_3ToBcp47(code: string): string | null {
  try {
    return new Intl.Locale(code).language;
  } catch {
    return null;
  }
}

function collectLanguageBcp47Tags(defaultsCountries: Record<string, CountryDefaultsV2Row>): Set<string> {
  const tags = new Set<string>();
  for (const code of FALLBACK_LANGUAGE_CODES) {
    tags.add(code);
  }
  for (const row of Object.values(defaultsCountries)) {
    for (const lang of row.languages ?? []) {
      const bcp = iso639_3ToBcp47(lang.iso639_3);
      if (bcp) tags.add(bcp);
    }
  }
  for (const v of languagesSeed.fieldTypes[0]?.values ?? []) {
    const meta = v.metadata as { bcp47?: string; iso639_1?: string } | undefined;
    const tag = meta?.bcp47 ?? meta?.iso639_1 ?? v.key;
    if (tag) tags.add(tag.toLowerCase());
  }
  return tags;
}

function buildLanguageValues(defaultsCountries: Record<string, CountryDefaultsV2Row>): import("../../src/data/packs/types").SeedValue[] {
  const en = new Intl.DisplayNames(["en"], { type: "language" });
  const es = new Intl.DisplayNames(["es"], { type: "language" });
  const fr = new Intl.DisplayNames(["fr"], { type: "language" });
  const de = new Intl.DisplayNames(["de"], { type: "language" });
  const tags = [...collectLanguageBcp47Tags(defaultsCountries)].sort();

  const fromIntl = tags.map((bcp47) => {
    const labelEn = en.of(bcp47) ?? bcp47;
    const aliases = [
      bcp47,
      bcp47.toUpperCase(),
      labelEn,
      ...[es.of(bcp47), fr.of(bcp47), de.of(bcp47)].filter((x): x is string => Boolean(x && x !== labelEn)),
    ];
    const iso639_3 = (() => {
      for (const row of Object.values(defaultsCountries)) {
        for (const lang of row.languages ?? []) {
          const mapped = iso639_3ToBcp47(lang.iso639_3);
          if (mapped === bcp47) return lang.iso639_3;
        }
      }
      return null;
    })();
    return {
      key: bcp47,
      label: labelEn,
      aliases: [...new Set(aliases.map((a) => a.trim()).filter(Boolean))],
      metadata: {
        source_standard: "bcp47",
        bcp47,
        iso639_1: bcp47.length === 2 ? bcp47 : null,
        iso639_3: iso639_3,
        english_name: labelEn,
      },
    };
  });

  return uniqueByKey([
    ...fromIntl,
    ...(languagesSeed.fieldTypes[0]?.values ?? []).map((value) => ({
      ...value,
      metadata: { ...(value.metadata ?? {}), source_overlay: "practical_aliases" },
    })),
  ]);
}

function buildStandardsTelephonyPack(): SeedPack {
  const values = buildE164CallingCodeSeedValues();
  return {
    key: "standards_telephony",
    name: "Telephony",
    version: "1.0.0",
    source: "datasets_country_codes",
    fieldTypes: [
      {
        key: "e164_country_calling_codes",
        name: "E.164 country calling codes",
        values,
      },
    ],
  };
}

export const standardsSourceAdapter: SourceAdapter = {
  name: "standards-source-adapter",
  async run(): Promise<SeedPack[]> {
    const defaultsCountries = loadDefaultsCountries();

    const currencyCodes = getSupportedValues("currency");
    const baseCurrencyCodes = currencyCodes.length > 0 ? currencyCodes : [...FALLBACK_CURRENCIES];
    const currencyKeys = new Set(baseCurrencyCodes.map((c) => c.toLowerCase()));
    for (const row of Object.values(defaultsCountries)) {
      if (row.currency) currencyKeys.add(row.currency.toLowerCase());
    }
    const currencyValues = [...currencyKeys].sort().map((code) => ({
      key: code.toLowerCase(),
      label: code.toUpperCase(),
      aliases: [code.toUpperCase(), code],
      metadata: { source_standard: "iso4217_like" },
    }));

    const timezoneCodes = getSupportedValues("timeZone");
    const baseZones =
      timezoneCodes.length > 0 ? [...timezoneCodes] : ["UTC", "Europe/Amsterdam", "America/Toronto"];
    const fromDefaults = new Set<string>();
    for (const row of Object.values(defaultsCountries)) {
      for (const tz of row.timezones ?? []) {
        if (tz.iana?.trim()) fromDefaults.add(tz.iana.trim());
      }
    }
    const timezoneList = Array.from(new Set(["UTC", ...baseZones, ...fromDefaults]));
    const timezoneValues = timezoneList.map((tz) => ({
      key: ianaTimezoneValueKey(tz),
      label: tz,
      aliases: [tz],
      metadata: { source_standard: "iana", iana: tz },
    }));

    const languageValues = buildLanguageValues(defaultsCountries);

    const standardsCurrencies: SeedPack = {
      key: "standards_currencies",
      name: "Currencies",
      version: "2.0.0",
      source: "official+overlay",
      fieldTypes: [
        {
          key: "currencies",
          name: "Currencies",
          values: uniqueByKey([
            ...currencyValues,
            ...(currenciesSeed.fieldTypes[0]?.values ?? []).map((value) => ({
              ...value,
              metadata: { ...(value.metadata ?? {}), source_overlay: "practical_aliases" },
            })),
          ]),
        },
      ],
    };

    const standardsLanguages: SeedPack = {
      key: "standards_languages",
      name: "Languages",
      version: "2.0.0",
      source: "official+overlay",
      fieldTypes: [
        {
          key: "languages",
          name: "Languages",
          values: languageValues,
        },
      ],
    };

    const standardsTimezones: SeedPack = {
      key: "standards_timezones",
      name: "Timezones",
      version: "2.0.0",
      source: "official+overlay",
      fieldTypes: [
        {
          key: "timezones",
          name: "Timezones",
          values: uniqueByKey([
            ...timezoneValues,
            ...(timezonesSeed.fieldTypes[0]?.values ?? []).map((value) => ({
              ...value,
              key: ianaTimezoneValueKey((value.metadata as { iana?: string })?.iana ?? value.label),
              metadata: { ...(value.metadata ?? {}), source_overlay: "practical_aliases" },
            })),
          ]),
        },
      ],
    };

    const standardsTelephony = buildStandardsTelephonyPack();

    for (const pack of [standardsCurrencies, standardsLanguages, standardsTimezones, standardsTelephony]) {
      for (const fieldType of pack.fieldTypes) {
        validateSeedValues(fieldType.values, `${pack.key}.${fieldType.key}`);
      }
    }

    return [standardsCurrencies, standardsLanguages, standardsTimezones, standardsTelephony];
  },
};
