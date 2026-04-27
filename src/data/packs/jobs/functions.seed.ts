import type { SeedPack } from "@/data/packs/types";

export const jobFunctionsSeed: SeedPack = {
  key: "jobs",
  name: "Jobs",
  version: "1.0.0",
  source: "manual",
  fieldTypes: [
    {
      key: "job_functions",
      name: "Job Functions",
      values: [
        { key: "engineering", label: "Engineering" },
        { key: "sales", label: "Sales" },
        { key: "marketing", label: "Marketing" },
      ],
    },
  ],
};
