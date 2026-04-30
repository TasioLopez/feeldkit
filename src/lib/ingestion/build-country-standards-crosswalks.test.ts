import { describe, expect, it } from "vitest";
import type { SeedPack } from "@/data/packs/types";
import { buildCountryStandardsCrosswalksFromPacks } from "@/lib/ingestion/build-country-standards-crosswalks";

describe("buildCountryStandardsCrosswalksFromPacks", () => {
  it("emits crosswalk rows for countries with iso2 metadata", () => {
    const packs: SeedPack[] = [
      {
        key: "geo",
        name: "Geo",
        version: "1",
        source: "test",
        fieldTypes: [
          {
            key: "countries",
            name: "Countries",
            values: [{ key: "netherlands", label: "Netherlands", metadata: { iso2: "NL" } }],
          },
        ],
      },
    ];
    const rows = buildCountryStandardsCrosswalksFromPacks(packs);
    expect(rows.some((r) => r.crosswalkType === "country_default_currency" && r.fromValueKey === "netherlands")).toBe(true);
    expect(rows.some((r) => r.crosswalkType === "country_official_language")).toBe(true);
    expect(rows.some((r) => r.crosswalkType === "country_default_timezone")).toBe(true);
  });
});
