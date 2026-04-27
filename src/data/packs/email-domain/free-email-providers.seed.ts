import type { SeedPack } from "@/data/packs/types";

export const freeEmailProvidersSeed: SeedPack = {
  key: "email_domain",
  name: "Email Domain",
  version: "1.0.0",
  source: "manual",
  fieldTypes: [
    {
      key: "free_email_providers",
      name: "Free Email Providers",
      values: [
        { key: "gmail-com", label: "gmail.com" },
        { key: "outlook-com", label: "outlook.com" },
        { key: "yahoo-com", label: "yahoo.com" },
      ],
    },
  ],
};
