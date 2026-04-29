import type { SeedPack } from "../../src/data/packs/types";
import { geoCountriesSeed } from "../../src/data/packs/geo/countries.seed";
import { geoSubdivisionsNlSeed } from "../../src/data/packs/geo/subdivisions-netherlands.seed";
import type { SourceAdapter } from "./types";
import { safeFetchJson, toDeterministicKey, uniqueByKey, validateSeedValues } from "./utils";

type CountryRow = {
  name: string;
  "alpha-2": string;
  "alpha-3"?: string;
  countryCode?: string;
  region?: string;
  subregion?: string;
};

const COUNTRIES_URL = "https://raw.githubusercontent.com/lukes/ISO-3166-Countries-with-Regional-Codes/master/all/all.json";

export const geoSourceAdapter: SourceAdapter = {
  name: "geo-source-adapter",
  async run(): Promise<SeedPack[]> {
    const rows = await safeFetchJson<CountryRow[]>(COUNTRIES_URL);
    const official = (rows ?? [])
      .filter((row) => row.name && row["alpha-2"])
      .map((row) => ({
        key: toDeterministicKey(row.name),
        label: row.name,
        aliases: [row["alpha-2"], row["alpha-3"] ?? ""].filter(Boolean),
        metadata: {
          source_standard: "iso3166",
          iso2: row["alpha-2"],
          iso3: row["alpha-3"] ?? null,
          dial_code: row.countryCode ?? null,
          region: row.region ?? null,
          subregion: row.subregion ?? null,
        },
      }));

    const countries =
      official.length > 0
        ? official
        : (geoCountriesSeed.fieldTypes[0]?.values ?? []).map((value) => ({
            ...value,
            metadata: { ...(value.metadata ?? {}), source_standard: "seed_fallback" },
          }));

    const geoCountries: SeedPack = {
      ...geoCountriesSeed,
      source: official.length > 0 ? "official+overlay" : "seed-fallback",
      fieldTypes: [
        {
          ...geoCountriesSeed.fieldTypes[0],
          values: uniqueByKey([
            ...countries,
            ...(geoCountriesSeed.fieldTypes[0]?.values ?? []).map((value) => ({
              ...value,
              metadata: { ...(value.metadata ?? {}), source_overlay: "practical_aliases" },
            })),
          ]),
        },
      ],
    };
    validateSeedValues(geoCountries.fieldTypes[0]?.values ?? [], "geo.countries");

    const subdivisions: SeedPack = {
      ...geoSubdivisionsNlSeed,
      source: "official+overlay",
      fieldTypes: geoSubdivisionsNlSeed.fieldTypes.map((fieldType) => ({
        ...fieldType,
        values: uniqueByKey(
          fieldType.values.map((value) => ({
            ...value,
            metadata: { ...(value.metadata ?? {}), source_overlay: "practical_subdivisions" },
          })),
        ),
      })),
    };
    validateSeedValues(subdivisions.fieldTypes[0]?.values ?? [], "geo.subdivisions");

    return [geoCountries, subdivisions];
  },
};
