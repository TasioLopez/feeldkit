import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { SeedPack, SeedValue } from "../../src/data/packs/types";
import { geoCountriesSeed } from "../../src/data/packs/geo/countries.seed";
import { geoContinentsSeed } from "../../src/data/packs/geo/continents.seed";
import { geoRegionGroupsSeed } from "../../src/data/packs/geo/region-groups.seed";
import { geoSubdivisionsNlSeed } from "../../src/data/packs/geo/subdivisions-netherlands.seed";
import {
  mergeCountryValuesByIso2,
  mergeSubdivisionValuesByIso3166_2,
  unRegionSlug,
} from "./geo-merge";
import { parseStatesCsvToSubdivisionSeeds } from "./parse-states-csv";
import { safeFetchJson, toDeterministicKey, uniqueByKey, validateSeedValues } from "./utils";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const COUNTRIES_URL = "https://raw.githubusercontent.com/lukes/ISO-3166-Countries-with-Regional-Codes/master/all/all.json";
const SNAPSHOT_COUNTRIES = resolve(__dirname, "snapshots", "iso-3166-countries-with-regional-codes.json");
const SNAPSHOT_STATES_CSV = resolve(__dirname, "snapshots", "states.csv");
const ADMIN1_LABELS_JSON = resolve(__dirname, "..", "..", "src", "data", "packs", "geo", "admin1-labels-by-iso2.json");

type CountryRow = {
  name: string;
  "alpha-2": string;
  "alpha-3"?: string;
  /** ISO 3166-1 numeric (not telephone). */
  "country-code"?: string;
  countryCode?: string;
  region?: string;
  subregion?: string;
  "sub-region"?: string;
};

type Admin1LabelsRow = {
  admin1_label_en?: string | null;
  admin1_label_native?: string | null;
  admin1_label_key?: string | null;
};

async function loadAdmin1ByIso2(): Promise<Record<string, Admin1LabelsRow>> {
  try {
    const raw = await readFile(ADMIN1_LABELS_JSON, "utf8");
    return JSON.parse(raw) as Record<string, Admin1LabelsRow>;
  } catch {
    return {};
  }
}

function buildOfficialCountries(rows: CountryRow[], admin1ByIso: Record<string, Admin1LabelsRow>): SeedPack["fieldTypes"][0]["values"] {
  return rows
    .filter((row) => row.name && row["alpha-2"])
    .map((row) => {
      const iso2 = row["alpha-2"].toUpperCase();
      const key = iso2.toLowerCase();
      const legacy = toDeterministicKey(row.name);
      const admin1 = admin1ByIso[iso2] ?? {};
      const subLabel = row["sub-region"] ?? row.subregion ?? null;
      const aliases = new Set<string>([row.name, row["alpha-2"], row["alpha-3"] ?? "", legacy].filter(Boolean) as string[]);
      return {
        key,
        label: row.name.trim(),
        aliases: [...aliases],
        metadata: {
          source_standard: "iso3166",
          iso2,
          iso3: row["alpha-3"] ?? null,
          dial_code: row.countryCode ?? row["country-code"] ?? null,
          region: row.region ?? null,
          subregion: subLabel,
          un_region_slug: unRegionSlug(row.region ?? null),
          un_subregion_slug: unRegionSlug(subLabel),
          admin1_label_en: admin1.admin1_label_en ?? null,
          admin1_label_native: admin1.admin1_label_native ?? null,
          admin1_label_key: admin1.admin1_label_key ?? null,
        },
      };
    });
}

/**
 * Builds merged geo seed packs (countries, subdivisions, region groups).
 * Countries: network JSON with snapshot fallback. Subdivisions: always from committed `states.csv` snapshot.
 */
export async function buildGeoPacks(): Promise<SeedPack[]> {
  const admin1ByIso = await loadAdmin1ByIso2();
  const forceSnapshots = process.env.FEELDKIT_SOURCE_FORCE_SNAPSHOTS === "1";

  let countryRows: CountryRow[] | null = null;
  if (!forceSnapshots) {
    countryRows = await safeFetchJson<CountryRow[]>(COUNTRIES_URL);
  }
  if (!countryRows?.length) {
    const text = await readFile(SNAPSHOT_COUNTRIES, "utf8");
    countryRows = JSON.parse(text) as CountryRow[];
  }

  const officialCountries = buildOfficialCountries(countryRows ?? [], admin1ByIso);
  const overlayCountries = (geoCountriesSeed.fieldTypes[0]?.values ?? []).map((value) => ({
    ...value,
    metadata: { ...(value.metadata ?? {}), source_overlay: "practical_aliases" },
  }));
  const mergedCountries = mergeCountryValuesByIso2(officialCountries, overlayCountries);
  validateSeedValues(mergedCountries, "geo.countries");

  const geoCountries: SeedPack = {
    ...geoCountriesSeed,
    source: countryRows?.length ? "official+overlay" : "snapshot+overlay",
    fieldTypes: [
      {
        ...geoCountriesSeed.fieldTypes[0],
        values: mergedCountries,
      },
    ],
  };

  const statesCsv = await readFile(SNAPSHOT_STATES_CSV, "utf8");
  const officialSubdivisions = parseStatesCsvToSubdivisionSeeds(statesCsv);
  const overlaySubdivisions = (geoSubdivisionsNlSeed.fieldTypes[0]?.values ?? []).map((value) => ({
    ...value,
    metadata: { ...(value.metadata ?? {}), source_overlay: "practical_subdivisions" },
  }));
  const mergedSubs = mergeSubdivisionValuesByIso3166_2(officialSubdivisions, overlaySubdivisions);
  validateSeedValues(mergedSubs, "geo.subdivisions");

  const subdivisions: SeedPack = {
    ...geoSubdivisionsNlSeed,
    source: "iso3166_2_snapshot+overlay",
    fieldTypes: [
      {
        ...geoSubdivisionsNlSeed.fieldTypes[0],
        values: mergedSubs,
      },
    ],
  };

  return [geoCountries, subdivisions, geoRegionGroupsSeed, geoContinentsSeed];
}
