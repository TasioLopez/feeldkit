import type { SeedPack } from "@/data/packs/types";

export const eventSeveritySeed: SeedPack = {
  key: "events",
  name: "Events",
  version: "1.0.0",
  source: "manual",
  fieldTypes: [
    {
      key: "event_severity",
      name: "Event Severity",
      values: [
        { key: "low", label: "low" },
        { key: "medium", label: "medium" },
        { key: "high", label: "high" },
        { key: "critical", label: "critical" },
      ],
    },
  ],
};
