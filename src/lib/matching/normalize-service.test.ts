import { describe, expect, it } from "vitest";
import { normalizeOne } from "@/lib/matching/normalize-service";

describe("normalize service", () => {
  it("normalizes country aliases", async () => {
    const result = await normalizeOne({ field_key: "countries", value: "NL" });
    expect(result.status).toBe("matched");
    expect(result.match?.key).toBe("netherlands");
    expect(result.explain.version).toBe("1");
    expect(result.explain.winner?.key).toBe("netherlands");
    expect(result.explain.policy.domain).toBe("geo");
    expect(typeof result.trace.prior_decision_count).toBe("number");
  });

  it("normalizes technology aliases", async () => {
    const result = await normalizeOne({ field_key: "technology_vendors", value: "GA4" });
    expect(result.match?.key).toBe("google-analytics");
    expect(result.explain.signals.length).toBeGreaterThan(0);
  });

  it("resolves company_industry through canonical ref to linkedin industry codes", async () => {
    const result = await normalizeOne({ field_key: "company_industry", value: "Software" });
    expect(result.status).toBe("matched");
    expect(result.match?.key).toBe("computer-software");
    expect(result.trace?.resolved_via).toBe("canonical_ref");
    expect(result.trace?.consumer_field_key).toBe("company_industry");
    expect(result.trace?.canonical_field_key).toBe("linkedin_industry_codes");
    expect(result.explain.resolved_field_key).toBe("linkedin_industry_codes");
    expect(result.explain.policy.domain).toBe("industry");
  });

  it("prefers locale-aligned language aliases when display_language is set", async () => {
    const result = await normalizeOne({
      field_key: "languages",
      value: "en",
      context: { display_language: "en" },
    });
    expect(result.status).toBe("matched");
    expect(result.match?.key).toBe("en");
    expect(result.explain.policy.domain).toBe("standards");
  });

  it("emits explain even when nothing matches", async () => {
    const result = await normalizeOne({ field_key: "countries", value: "totally unknown phrase 123" });
    expect(result.status).toBe("unmatched");
    expect(result.explain.version).toBe("1");
    expect(result.explain.winner).toBeNull();
    expect(result.needs_review).toBe(true);
  });
});
