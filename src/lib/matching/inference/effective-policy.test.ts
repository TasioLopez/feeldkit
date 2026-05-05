import { describe, expect, it } from "vitest";
import { StaticGovernanceRepository } from "@/lib/governance/static-governance-repository";
import type { OrgPolicyOverride } from "@/lib/governance/types";
import { resolveEffectivePolicy } from "@/lib/matching/inference/effective-policy";
import { DOMAIN_POLICIES } from "@/lib/matching/inference/policy";

describe("resolveEffectivePolicy", () => {
  it("falls back to coded defaults when org id is missing", async () => {
    const repo = new StaticGovernanceRepository();
    const r = await resolveEffectivePolicy(repo, null, "countries");
    expect(r.thresholdsSource).toBe("default");
    expect(r.thresholds).toEqual({
      matched: DOMAIN_POLICIES.geo.matched,
      suggested: DOMAIN_POLICIES.geo.suggested,
    });
    expect(r.domain).toBe("geo");
    expect(r.fieldLock).toBeNull();
  });

  it("uses org override when consistent", async () => {
    const override: OrgPolicyOverride = {
      id: "o1",
      organizationId: "org-a",
      domain: "geo",
      matched: 0.99,
      suggested: 0.8,
      notes: null,
      updatedAt: "",
      updatedBy: null,
    };
    const repo = new StaticGovernanceRepository([override]);
    const r = await resolveEffectivePolicy(repo, "org-a", "countries");
    expect(r.thresholdsSource).toBe("org_override");
    expect(r.thresholds).toEqual({ matched: 0.99, suggested: 0.8 });
    expect(r.overrideIgnoredReason).toBeUndefined();
  });

  it("ignores inconsistent override and keeps default", async () => {
    const override: OrgPolicyOverride = {
      id: "bad",
      organizationId: "org-a",
      domain: "geo",
      matched: 0.5,
      suggested: 0.9,
      notes: null,
      updatedAt: "",
      updatedBy: null,
    };
    const repo = new StaticGovernanceRepository([override]);
    const r = await resolveEffectivePolicy(repo, "org-a", "countries");
    expect(r.thresholdsSource).toBe("default");
    expect(r.thresholds).toEqual({
      matched: DOMAIN_POLICIES.geo.matched,
      suggested: DOMAIN_POLICIES.geo.suggested,
    });
    expect(r.overrideIgnoredReason).toBe("override_thresholds_inconsistent");
  });

  it("returns field lock when present", async () => {
    const repo = new StaticGovernanceRepository([], [
      {
        id: "l1",
        organizationId: "org-a",
        fieldKey: "countries",
        mode: "require_review",
        reason: "regulatory",
        createdAt: "",
        createdBy: null,
      },
    ]);
    const r = await resolveEffectivePolicy(repo, "org-a", "countries");
    expect(r.fieldLock?.mode).toBe("require_review");
    expect(r.fieldLock?.fieldKey).toBe("countries");
  });
});
