import type { SeedPack } from "@/data/packs/types";

export const eventTypesSeed: SeedPack = {
  key: "events",
  name: "Events",
  version: "1.0.0",
  source: "manual",
  fieldTypes: [
    {
      key: "event_types",
      name: "Event Types",
      values: [
        { key: "funding-event", label: "funding event" },
        { key: "hiring-event", label: "hiring event" },
        { key: "product-launch", label: "product launch" },
      ],
    },
  ],
};
