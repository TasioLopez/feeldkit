import type { SeedPack } from "@/data/packs/types";

export const vendorNormalizationSeed: SeedPack = {
  key: "tech",
  name: "Tech",
  version: "1.0.0",
  source: "manual",
  fieldTypes: [
    {
      key: "technology_vendors",
      name: "Technology Vendors",
      values: [
        { key: "google-analytics", label: "Google Analytics", aliases: ["GA4", "Google Analytics 4"] },
        { key: "hubspot", label: "HubSpot", aliases: ["Hubspot"] },
      ],
    },
  ],
};
