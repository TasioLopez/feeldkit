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
        { key: "nl_zh", label: "South Holland", aliases: ["Zuid Holland", "nl-zuid-holland"], metadata: { country_iso2: "NL", iso3166_2: "NL-ZH" } },
        { key: "nl_nh", label: "North Holland", aliases: ["Noord Holland", "nl-noord-holland"], metadata: { country_iso2: "NL", iso3166_2: "NL-NH" } },
      ],
    },
  ],
};
