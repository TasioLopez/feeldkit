import { describe, expect, it } from "vitest";
import type { SeedPack } from "@/data/packs/types";
import { geoContinentsSeed } from "@/data/packs/geo/continents.seed";
import { buildGeoContinentCrosswalksFromPacks } from "@/lib/ingestion/build-geo-continent-crosswalks";

describe("buildGeoContinentCrosswalksFromPacks", () => {
  it("emits country_in_continent from un_region_slug", () => {
    const packs: SeedPack[] = [
      {
        key: "geo",
        name: "Geo",
        version: "1",
        source: "test",
        fieldTypes: [
          ...(geoContinentsSeed.fieldTypes ?? []),
          {
            key: "countries",
            name: "Countries",
            values: [
              {
                key: "nl",
                label: "Netherlands",
                metadata: { iso2: "NL", region: "Europe", un_region_slug: "europe" },
              },
            ],
          },
        ],
      },
    ];
    const rows = buildGeoContinentCrosswalksFromPacks(packs);
    expect(rows.some((r) => r.crosswalkType === "country_in_continent" && r.fromValueKey === "nl" && r.toValueKey === "europe")).toBe(true);
  });
});
