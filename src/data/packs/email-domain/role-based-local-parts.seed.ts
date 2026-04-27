import type { SeedPack } from "@/data/packs/types";

export const roleBasedLocalPartsSeed: SeedPack = {
  key: "email_domain",
  name: "Email Domain",
  version: "1.0.0",
  source: "manual",
  fieldTypes: [
    {
      key: "role_based_local_parts",
      name: "Role-based Local Parts",
      values: [
        { key: "info", label: "info" },
        { key: "support", label: "support" },
        { key: "sales", label: "sales" },
      ],
    },
  ],
};
