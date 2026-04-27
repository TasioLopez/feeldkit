import type { SeedPack } from "@/data/packs/types";

export const techCategoriesSeed: SeedPack = {
  key: "tech",
  name: "Tech",
  version: "1.0.0",
  source: "manual",
  fieldTypes: [
    {
      key: "technology_categories",
      name: "Technology Categories",
      values: [
        { key: "analytics", label: "Analytics" },
        { key: "crm", label: "CRM" },
        { key: "cms", label: "CMS" },
      ],
    },
  ],
};
