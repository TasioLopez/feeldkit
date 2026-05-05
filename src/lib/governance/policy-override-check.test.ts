import { describe, expect, it } from "vitest";
import { orgPolicyOverrideRowConsistent } from "@/lib/governance/policy-override-check";

describe("orgPolicyOverrideRowConsistent", () => {
  it("accepts valid rows", () => {
    expect(orgPolicyOverrideRowConsistent(0.95, 0.7)).toBe(true);
  });

  it("rejects matched <= suggested", () => {
    expect(orgPolicyOverrideRowConsistent(0.5, 0.9)).toBe(false);
    expect(orgPolicyOverrideRowConsistent(0.8, 0.8)).toBe(false);
  });

  it("rejects out-of-range thresholds", () => {
    expect(orgPolicyOverrideRowConsistent(1.1, 0.5)).toBe(false);
    expect(orgPolicyOverrideRowConsistent(0.9, -0.1)).toBe(false);
  });
});
