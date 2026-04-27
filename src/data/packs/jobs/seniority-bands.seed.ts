import type { SeedPack } from "@/data/packs/types";

export const seniorityBandsSeed: SeedPack = {
  key: "jobs",
  name: "Jobs",
  version: "1.0.0",
  source: "manual",
  fieldTypes: [
    {
      key: "seniority_bands",
      name: "Seniority Bands",
      values: [
        { key: "ic", label: "IC" },
        { key: "manager", label: "Manager" },
        { key: "vp", label: "VP" },
        { key: "c-level", label: "C-level" },
      ],
    },
  ],
};
