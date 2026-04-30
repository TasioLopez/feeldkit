import type { SeedPack } from "@/data/packs/types";

export const currenciesSeed: SeedPack = {
  key: "standards_currencies",
  name: "Currencies",
  version: "2.0.0",
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
