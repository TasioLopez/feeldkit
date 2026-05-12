import type { SeedPack } from "@/data/packs/types";

/** UN statistical macro-regions (keys match `un_region_slug` on country rows from ISO regional dataset). */
export const geoContinentsSeed: SeedPack = {
  key: "geo",
  name: "Geo",
  version: "1.0.0",
  source: "un_statistical_regions",
  fieldTypes: [
    {
      key: "geo_continents",
      name: "Geo continents (UN macro regions)",
      values: [
        {
          key: "africa",
          label: "Africa",
          aliases: ["AF"],
          metadata: { source_standard: "un_m49_macro", un_region_label: "Africa" },
        },
        {
          key: "americas",
          label: "Americas",
          aliases: ["AM"],
          metadata: { source_standard: "un_m49_macro", un_region_label: "Americas" },
        },
        {
          key: "asia",
          label: "Asia",
          aliases: ["AS"],
          metadata: { source_standard: "un_m49_macro", un_region_label: "Asia" },
        },
        {
          key: "europe",
          label: "Europe",
          aliases: ["EU"],
          metadata: { source_standard: "un_m49_macro", un_region_label: "Europe" },
        },
        {
          key: "oceania",
          label: "Oceania",
          aliases: ["OC"],
          metadata: { source_standard: "un_m49_macro", un_region_label: "Oceania" },
        },
      ],
    },
  ],
};
