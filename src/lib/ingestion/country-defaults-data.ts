import raw from "@/data/country-iso2-defaults.json";

export type CountryDefaultsV2Row = {
  currency: string | null;
  languages: Array<{ iso639_3: string; primary: boolean }>;
  timezones: Array<{ iana: string; primary: boolean }>;
};

export type CountryDefaultsFile = { version: 2; countries: Record<string, CountryDefaultsV2Row> };

export function loadCountryDefaultsV2(): Record<string, CountryDefaultsV2Row> {
  const root = raw as unknown as CountryDefaultsFile;
  if (root?.version !== 2 || !root.countries) {
    throw new Error("country-iso2-defaults.json must be version 2 with `countries` map");
  }
  return root.countries;
}
