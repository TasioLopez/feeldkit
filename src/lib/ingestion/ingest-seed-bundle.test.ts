import { describe, expect, it } from "vitest";
import type { SeedPack } from "@/data/packs/types";
import { mergePacks } from "@/lib/ingestion/ingest-seed-bundle";

describe("ingest-seed-bundle", () => {
  it("merges duplicate pack keys while preserving unique field types", () => {
    const packs: SeedPack[] = [
      {
        key: "geo",
        name: "Geo",
        version: "1.0.0",
        source: "test",
        fieldTypes: [{ key: "countries", name: "Countries", values: [] }],
      },
      {
        key: "geo",
        name: "Geo",
        version: "1.0.0",
        source: "test",
        fieldTypes: [{ key: "timezones", name: "Timezones", values: [] }],
      },
      {
        key: "geo",
        name: "Geo",
        version: "1.0.0",
        source: "test",
        fieldTypes: [{ key: "countries", name: "Countries", values: [] }],
      },
    ];

    const merged = mergePacks(packs);
    const geo = merged.get("geo");
    expect(merged.size).toBe(1);
    expect(geo?.fieldTypes.map((entry) => entry.key)).toEqual(["countries", "timezones"]);
  });
});
