import type { SeedPack } from "@/data/packs/types";

export const fundingStagesSeed: SeedPack = {
  key: "company",
  name: "Company",
  version: "1.0.0",
  source: "manual",
  fieldTypes: [
    {
      key: "funding_stages",
      name: "Funding Stages",
      values: [
        { key: "pre-seed", label: "Pre-seed" },
        { key: "seed", label: "Seed" },
        { key: "series-a", label: "Series A" },
        { key: "series-b", label: "Series B" },
      ],
    },
  ],
};
