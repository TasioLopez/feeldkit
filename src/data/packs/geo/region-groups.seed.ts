import type { SeedPack } from "@/data/packs/types";

/** Supranational / commercial region groups (membership via `region-group-memberships.json` + crosswalks). */
export const geoRegionGroupsSeed: SeedPack = {
  key: "geo",
  name: "Geo",
  version: "1.0.0",
  source: "curated_region_groups",
  fieldTypes: [
    {
      key: "geo_region_groups",
      name: "Geo region groups",
      values: [
        {
          key: "eu",
          label: "European Union",
          aliases: ["EU", "European Union (EU)"],
          metadata: { group_kind: "legal_treaty", description: "EU member states (approx. current membership)." },
        },
        {
          key: "eea",
          label: "European Economic Area",
          aliases: ["EEA"],
          metadata: { group_kind: "legal_treaty", description: "EU plus Iceland, Liechtenstein, Norway." },
        },
        {
          key: "dach",
          label: "DACH",
          aliases: ["D-A-CH"],
          metadata: { group_kind: "informal", description: "Germany, Austria, Switzerland macro region." },
        },
        {
          key: "benelux",
          label: "Benelux",
          aliases: ["BENELUX"],
          metadata: { group_kind: "informal", description: "Belgium, Netherlands, Luxembourg." },
        },
        {
          key: "asean",
          label: "ASEAN",
          aliases: ["Association of Southeast Asian Nations"],
          metadata: { group_kind: "intergovernmental", description: "ASEAN member states." },
        },
        {
          key: "oecd",
          label: "OECD",
          aliases: ["Organisation for Economic Co-operation and Development"],
          metadata: { group_kind: "intergovernmental", description: "OECD members (approximate list)." },
        },
        {
          key: "g7",
          label: "Group of Seven",
          aliases: ["G7", "G-7"],
          metadata: { group_kind: "intergovernmental", description: "G7 members." },
        },
        {
          key: "g20",
          label: "Group of Twenty",
          aliases: ["G20", "G-20"],
          metadata: { group_kind: "intergovernmental", description: "G20 members (country participants only)." },
        },
      ],
    },
  ],
};
