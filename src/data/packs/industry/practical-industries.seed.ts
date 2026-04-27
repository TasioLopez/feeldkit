import type { SeedPack } from "@/data/packs/types";

export const practicalIndustriesSeed: SeedPack = {
  key: "industry",
  name: "Industry",
  version: "1.0.0",
  source: "manual",
  fieldTypes: [
    {
      key: "practical_industry",
      name: "Practical Industry",
      values: [
        { key: "saas", label: "SaaS" },
        { key: "fintech", label: "FinTech" },
        { key: "healthtech", label: "HealthTech" },
        { key: "martech", label: "MarTech" },
      ],
    },
  ],
};
