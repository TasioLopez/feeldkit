import type { SeedPack } from "../../src/data/packs/types";
import { currenciesSeed } from "../../src/data/packs/standards/currencies.seed";
import { languagesSeed } from "../../src/data/packs/standards/languages.seed";
import { timezonesSeed } from "../../src/data/packs/standards/timezones.seed";
import type { SourceAdapter } from "./types";
import { toDeterministicKey, uniqueByKey, validateSeedValues } from "./utils";

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

const FALLBACK_LANGUAGES = [
  ["en", "English"],
  ["fr", "French"],
  ["de", "German"],
  ["es", "Spanish"],
  ["it", "Italian"],
  ["pt", "Portuguese"],
  ["nl", "Dutch"],
  ["sv", "Swedish"],
  ["pl", "Polish"],
  ["tr", "Turkish"],
] as const;

function getSupportedValues(kind: "timeZone" | "currency"): string[] {
  try {
    // Node 20+ support
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const values = (Intl as any).supportedValuesOf?.(kind);
    return Array.isArray(values) ? values : [];
  } catch {
    return [];
  }
}

export const standardsSourceAdapter: SourceAdapter = {
  name: "standards-source-adapter",
  async run(): Promise<SeedPack[]> {
    const currencyCodes = getSupportedValues("currency");
    const currencyValues =
      (currencyCodes.length > 0 ? currencyCodes : FALLBACK_CURRENCIES).map((code) => ({
        key: code.toLowerCase(),
        label: code,
        aliases: [code],
        metadata: { source_standard: "iso4217_like" },
      }));

    const languageDisplay = new Intl.DisplayNames(["en"], { type: "language" });
    const languageValues = FALLBACK_LANGUAGES.map(([code, label]) => ({
      key: toDeterministicKey(label),
      label: languageDisplay.of(code) ?? label,
      aliases: [code],
      metadata: { source_standard: "iso639_like" },
    }));

    const timezoneCodes = getSupportedValues("timeZone");
    const timezoneValues = (timezoneCodes.length > 0 ? timezoneCodes : ["UTC", "Europe/Amsterdam", "America/Toronto"]).map((tz) => ({
      key: toDeterministicKey(tz),
      label: tz,
      metadata: { source_standard: "iana" },
    }));

    const standards: SeedPack = {
      key: "standards",
      name: "Standards",
      version: "1.1.0",
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
        {
          key: "languages",
          name: "Languages",
          values: uniqueByKey([
            ...languageValues,
            ...(languagesSeed.fieldTypes[0]?.values ?? []).map((value) => ({
              ...value,
              metadata: { ...(value.metadata ?? {}), source_overlay: "practical_aliases" },
            })),
          ]),
        },
        {
          key: "timezones",
          name: "Timezones",
          values: uniqueByKey([
            ...timezoneValues,
            ...(timezonesSeed.fieldTypes[0]?.values ?? []).map((value) => ({
              ...value,
              metadata: { ...(value.metadata ?? {}), source_overlay: "practical_aliases" },
            })),
          ]),
        },
      ],
    };
    for (const fieldType of standards.fieldTypes) {
      validateSeedValues(fieldType.values, `standards.${fieldType.key}`);
    }

    return [standards];
  },
};
