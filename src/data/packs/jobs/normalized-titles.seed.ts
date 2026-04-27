import type { SeedPack } from "@/data/packs/types";

export const normalizedTitlesSeed: SeedPack = {
  key: "jobs",
  name: "Jobs",
  version: "1.0.0",
  source: "manual",
  fieldTypes: [
    {
      key: "normalized_job_titles",
      name: "Normalized Job Titles",
      values: [
        { key: "vp-engineering", label: "VP of Engineering", aliases: ["VP Eng"] },
        { key: "sales-representative", label: "Sales Representative", aliases: ["sales guy"] },
      ],
    },
  ],
};
