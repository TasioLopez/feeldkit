import type { SeedPack } from "@/data/packs/types";

export const companyTypesSeed: SeedPack = {
  key: "company",
  name: "Company",
  version: "1.0.0",
  source: "manual",
  fieldTypes: [
    {
      key: "company_types",
      name: "Company Types",
      values: [
        { key: "public", label: "Public" },
        { key: "private", label: "Private" },
        { key: "non-profit", label: "Non-profit" },
        { key: "government", label: "Government" },
      ],
    },
  ],
};
