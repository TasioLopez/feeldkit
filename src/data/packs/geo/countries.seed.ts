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
        { key: "nl", label: "Netherlands", aliases: ["NL", "Nederland", "Holland", "netherlands"], metadata: { iso2: "NL", iso3: "NLD", region: "Europe", un_region_slug: "europe" } },
        { key: "ca", label: "Canada", aliases: ["CA", "canada"], metadata: { iso2: "CA", iso3: "CAN", region: "Americas", un_region_slug: "americas" } },
      ],
    },
  ],
};
