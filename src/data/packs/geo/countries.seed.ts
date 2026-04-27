import type { SeedPack } from "@/data/packs/types";

export const geoCountriesSeed: SeedPack = {
  key: "geo",
  name: "Geo",
  version: "1.0.0",
  source: "manual+iso-sample",
  fieldTypes: [
    {
      key: "countries",
      name: "Countries",
      values: [
        { key: "netherlands", label: "Netherlands", aliases: ["NL", "Nederland", "Holland"], metadata: { iso2: "NL", iso3: "NLD" } },
        { key: "canada", label: "Canada", aliases: ["CA"], metadata: { iso2: "CA", iso3: "CAN" } },
      ],
    },
  ],
};
