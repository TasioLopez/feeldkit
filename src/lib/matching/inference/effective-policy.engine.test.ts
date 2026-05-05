import { describe, expect, it } from "vitest";
import { StaticGovernanceRepository } from "@/lib/governance/static-governance-repository";
import type { OrgPolicyOverride } from "@/lib/governance/types";
import {
  classifyWithEffectivePolicy,
  resolveEffectivePolicy,
} from "@/lib/matching/inference/effective-policy";

describe("effective policy + locks (engine-facing)", () => {
  it("require_review forces needsReview even when score is high", async () => {
    const repo = new StaticGovernanceRepository([], [
      {
        id: "l1",
        organizationId: "org-a",
        fieldKey: "countries",
        mode: "require_review",
        reason: "test",
        createdAt: "",
        createdBy: null,
      },
    ]);
    const effective = await resolveEffectivePolicy(repo, "org-a", "countries");
    const decision = classifyWithEffectivePolicy(0.99, effective);
    expect(decision.needsReview).toBe(true);
  });

  it("disable_auto_apply downgrades matched to suggested", async () => {
    const override: OrgPolicyOverride = {
      id: "o1",
      organizationId: "org-a",
      domain: "geo",
      matched: 0.5,
      suggested: 0.2,
      notes: null,
      updatedAt: "",
      updatedBy: null,
    };
    const repo = new StaticGovernanceRepository([override], [
      {
        id: "l1",
        organizationId: "org-a",
        fieldKey: "countries",
        mode: "disable_auto_apply",
        reason: "test",
        createdAt: "",
        createdBy: null,
      },
    ]);
    const effective = await resolveEffectivePolicy(repo, "org-a", "countries");
    const decision = classifyWithEffectivePolicy(0.99, effective);
    expect(decision.status).toBe("suggested");
  });
});
