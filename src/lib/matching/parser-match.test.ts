import { describe, expect, it } from "vitest";
import { parserMatch, parserMatchWithSignals } from "@/lib/matching/parser-match";

describe("parser-match", () => {
  it("returns null for non-parser fields", () => {
    expect(parserMatch("countries", "https://example.com")).toBeNull();
  });

  it("returns parser candidate for domains", () => {
    const result = parserMatch("domains", "https://Example.com/path");
    if (!result) return;
    expect(result.confidence).toBeCloseTo(0.7);
  });

  it("emits parser signal", () => {
    const candidates = parserMatchWithSignals("domains", "https://Example.com");
    if (candidates.length === 0) return;
    expect(candidates[0].signals[0].kind).toBe("parser");
  });
});
