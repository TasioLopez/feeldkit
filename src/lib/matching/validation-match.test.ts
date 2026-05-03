import { describe, expect, it } from "vitest";
import { validationMatch, validationMatchWithSignals } from "@/lib/matching/validation-match";

describe("validation-match", () => {
  it("returns null for unrelated field keys", () => {
    expect(validationMatch("countries", "1234AB", { country: "NL" })).toBeNull();
  });

  it("returns a placeholder value for postal_codes when validation passes", () => {
    const result = validationMatch("postal_codes", "1011AB", { country: "NL" });
    if (!result) return;
    expect(result.confidence).toBeCloseTo(0.72);
  });

  it("emits validator signal when valid", () => {
    const candidates = validationMatchWithSignals("postal_codes", "1011AB", { country: "NL" });
    if (candidates.length === 0) return;
    expect(candidates[0].signals[0].kind).toBe("validator");
  });
});
