import type { SeedPack } from "@/data/packs/types";

export const languagesSeed: SeedPack = {
  key: "standards",
  name: "Standards",
  version: "1.0.0",
  source: "iso639-sample",
  fieldTypes: [
    {
      key: "languages",
      name: "Languages",
      values: [
        { key: "nl", label: "Dutch", aliases: ["Nederlands"], metadata: { iso639_1: "nl" } },
        { key: "en", label: "English", aliases: ["Eng"], metadata: { iso639_1: "en" } },
      ],
    },
  ],
};
