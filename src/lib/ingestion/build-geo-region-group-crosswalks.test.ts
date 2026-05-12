import { describe, expect, it } from "vitest";
import { buildGeoRegionGroupCrosswalksFromPacks } from "@/lib/ingestion/build-geo-region-group-crosswalks";

describe("buildGeoRegionGroupCrosswalksFromPacks", () => {
  it("emits country_in_region_group rows with lowercase ISO country keys", () => {
    const rows = buildGeoRegionGroupCrosswalksFromPacks();
    expect(rows.some((r) => r.crosswalkType === "country_in_region_group" && r.fromValueKey === "nl" && r.toValueKey === "eea")).toBe(
      true,
    );
    expect(rows.some((r) => r.fromValueKey === "de" && r.toValueKey === "dach")).toBe(true);
    expect(rows.length).toBeGreaterThan(100);
  });
});
