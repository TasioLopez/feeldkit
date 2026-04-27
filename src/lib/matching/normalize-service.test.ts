import { describe, expect, it } from "vitest";
import { normalizeOne } from "@/lib/matching/normalize-service";

describe("normalize service", () => {
  it("normalizes country aliases", async () => {
    const result = await normalizeOne({ field_key: "countries", value: "NL" });
    expect(result.status).toBe("matched");
    expect(result.match?.key).toBe("netherlands");
  });

  it("normalizes technology aliases", async () => {
    const result = await normalizeOne({ field_key: "technology_vendors", value: "GA4" });
    expect(result.match?.key).toBe("google-analytics");
  });
});
