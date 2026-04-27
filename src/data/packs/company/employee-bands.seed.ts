import type { SeedPack } from "@/data/packs/types";

export const employeeBandsSeed: SeedPack = {
  key: "company",
  name: "Company",
  version: "1.0.0",
  source: "manual",
  fieldTypes: [
    {
      key: "employee_size_bands",
      name: "Employee Size Bands",
      values: [
        { key: "1-10", label: "1-10" },
        { key: "11-50", label: "11-50", aliases: ["11-50 employees"] },
        { key: "51-200", label: "51-200" },
        { key: "201-500", label: "201-500" },
      ],
    },
  ],
};
