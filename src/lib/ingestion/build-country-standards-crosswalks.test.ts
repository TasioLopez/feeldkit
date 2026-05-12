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
            values: [{ key: "nl", label: "Netherlands", metadata: { iso2: "NL" } }],
          },
        ],
      },
    ];
    const rows = buildCountryStandardsCrosswalksFromPacks(packs);
    expect(rows.some((r) => r.crosswalkType === "country_default_currency" && r.fromValueKey === "nl")).toBe(true);
    expect(rows.some((r) => r.crosswalkType === "country_official_language")).toBe(true);
    expect(rows.some((r) => r.crosswalkType === "country_default_timezone")).toBe(true);
  });

  it("marks primary on official languages when multiple exist (BE)", () => {
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
            values: [{ key: "be", label: "Belgium", metadata: { iso2: "BE" } }],
          },
        ],
      },
    ];
    const rows = buildCountryStandardsCrosswalksFromPacks(packs).filter((r) => r.fromValueKey === "be" && r.crosswalkType === "country_official_language");
    expect(rows.length).toBeGreaterThanOrEqual(2);
    expect(rows.filter((r) => r.metadata?.primary === true).length).toBe(1);
    expect(rows.some((r) => r.toValueKey === "nl" && r.metadata?.primary === true)).toBe(true);
  });
});
