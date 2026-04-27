import type { SeedPack } from "@/data/packs/types";

export const revenueBandsSeed: SeedPack = {
  key: "company",
  name: "Company",
  version: "1.0.0",
  source: "manual",
  fieldTypes: [
    {
      key: "revenue_bands",
      name: "Revenue Bands",
      values: [
        { key: "0-1m-usd", label: "$0-$1M", metadata: { min: 0, max: 1000000, currency: "USD" } },
        { key: "1m-10m-usd", label: "$1M-$10M", metadata: { min: 1000000, max: 10000000, currency: "USD" } },
      ],
    },
  ],
};
