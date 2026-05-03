import { describe, expect, it } from "vitest";
import {
  assertPolicyConsistency,
  classifyWithPolicy,
  DOMAIN_POLICIES,
  inferDomain,
  policyFor,
} from "@/lib/matching/inference/policy";

describe("inference/policy", () => {
  it("infers domain by field key prefix", () => {
    expect(inferDomain("countries")).toBe("geo");
    expect(inferDomain("subdivisions")).toBe("geo");
    expect(inferDomain("languages")).toBe("standards");
    expect(inferDomain("currencies")).toBe("standards");
    expect(inferDomain("linkedin_industry_codes")).toBe("industry");
    expect(inferDomain("naics_codes")).toBe("industry");
    expect(inferDomain("company_industry")).toBe("industry");
    expect(inferDomain("normalized_job_titles")).toBe("jobs");
    expect(inferDomain("technology_vendors")).toBe("tech");
    expect(inferDomain("email_domains")).toBe("web");
    expect(inferDomain("totally_unknown")).toBe("default");
  });

  it("classifies score using policy thresholds", () => {
    const matched = classifyWithPolicy(0.99, "countries");
    expect(matched.status).toBe("matched");
    expect(matched.band).toBe("high");
    expect(matched.needsReview).toBe(false);

    const suggested = classifyWithPolicy(0.8, "countries");
    expect(suggested.status).toBe("suggested");
    expect(suggested.band).toBe("mid");

    const review = classifyWithPolicy(0.4, "countries");
    expect(review.status).toBe("review");
    expect(review.needsReview).toBe(true);
  });

  it("uses tighter thresholds for standards", () => {
    const decision = classifyWithPolicy(0.92, "currencies");
    expect(decision.status).toBe("suggested");
    expect(decision.thresholds.matched).toBe(0.97);
  });

  it("falls back to default policy for unknown domains", () => {
    const policy = policyFor("totally_unknown");
    expect(policy.matched).toBe(DOMAIN_POLICIES.default.matched);
  });

  it("policy table is consistent", () => {
    const result = assertPolicyConsistency();
    expect(result.problems).toEqual([]);
    expect(result.ok).toBe(true);
  });
});
