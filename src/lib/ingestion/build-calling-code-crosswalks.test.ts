import { describe, expect, it } from "vitest";
import type { SeedPack } from "@/data/packs/types";
import { buildCallingCodeCrosswalksFromPacks } from "@/lib/ingestion/build-calling-code-crosswalks";
import { buildE164CallingCodeSeedValues } from "@/lib/geo/telephony-seed-values";

describe("buildCallingCodeCrosswalksFromPacks", () => {
  it("emits country_uses_calling_code for NL to e164_31", () => {
    const dialValues = buildE164CallingCodeSeedValues();
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
      {
        key: "standards_telephony",
        name: "Telephony",
        version: "1",
        source: "test",
        fieldTypes: [{ key: "e164_country_calling_codes", name: "Dial", values: dialValues }],
      },
    ];
    const rows = buildCallingCodeCrosswalksFromPacks(packs);
    expect(rows.some((r) => r.fromValueKey === "nl" && r.toValueKey === "e164_31" && r.crosswalkType === "country_uses_calling_code")).toBe(
      true,
    );
  });
});
