import type { SeedPack } from "@/data/packs/types";

export const timezonesSeed: SeedPack = {
  key: "standards_timezones",
  name: "Timezones",
  version: "2.0.0",
  source: "iana-sample",
  fieldTypes: [
    {
      key: "timezones",
      name: "Timezones",
      values: [
        { key: "europe-amsterdam", label: "Europe/Amsterdam", aliases: ["CET"], metadata: { iana: "Europe/Amsterdam" } },
        { key: "america-toronto", label: "America/Toronto", aliases: ["EST"], metadata: { iana: "America/Toronto" } },
      ],
    },
  ],
};
