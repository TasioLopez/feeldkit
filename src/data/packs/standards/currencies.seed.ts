import type { SeedPack } from "@/data/packs/types";

export const currenciesSeed: SeedPack = {
  key: "standards",
  name: "Standards",
  version: "1.0.0",
  source: "iso4217-sample",
  fieldTypes: [
    {
      key: "currencies",
      name: "Currencies",
      values: [
        { key: "eur", label: "Euro", aliases: ["EUR", "€"], metadata: { code: "EUR", decimals: 2 } },
        { key: "usd", label: "US Dollar", aliases: ["USD", "$"], metadata: { code: "USD", decimals: 2 } },
      ],
    },
  ],
};
