import type { SeedPack } from "@/data/packs/types";

export const eventLifecycleStatesSeed: SeedPack = {
  key: "events",
  name: "Events",
  version: "1.0.0",
  source: "manual",
  fieldTypes: [
    {
      key: "event_lifecycle_states",
      name: "Event Lifecycle States",
      values: [
        { key: "detected", label: "detected" },
        { key: "enriched", label: "enriched" },
        { key: "verified", label: "verified" },
        { key: "dismissed", label: "dismissed" },
      ],
    },
  ],
};
