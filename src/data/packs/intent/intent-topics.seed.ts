import type { SeedPack } from "@/data/packs/types";

export const intentTopicsSeed: SeedPack = {
  key: "intent",
  name: "Intent",
  version: "1.0.0",
  source: "manual",
  fieldTypes: [
    {
      key: "intent_topics",
      name: "Intent Topics",
      values: [
        { key: "hiring", label: "hiring" },
        { key: "fundraising", label: "fundraising" },
        { key: "product-launch", label: "product launch" },
      ],
    },
  ],
};
