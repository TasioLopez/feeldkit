import type { SeedPack } from "@/data/packs/types";

export const geoSubdivisionsNlSeed: SeedPack = {
  key: "geo",
  name: "Geo",
  version: "1.0.0",
  source: "manual-sample",
  fieldTypes: [
    {
      key: "subdivisions",
      name: "Subdivisions",
      values: [
        { key: "nl-zuid-holland", label: "South Holland", aliases: ["Zuid Holland"], metadata: { country_iso2: "NL", iso3166_2: "NL-ZH" } },
        { key: "nl-noord-holland", label: "North Holland", aliases: ["Noord Holland"], metadata: { country_iso2: "NL", iso3166_2: "NL-NH" } },
      ],
    },
  ],
};
