import { describe, expect, it } from "vitest";
import { diffProfiles, summarizeDiff } from "@/lib/profiles/diff";
import type { OrgConfigProfileV1 } from "@/lib/api/types";

const BASE: OrgConfigProfileV1 = {
  schema: "feeldkit.org_config_profile.v1",
  manifest: {
    exported_at: "2026-05-07T19:00:00Z",
    source_organization_id: "org-1",
    feeldkit_app_version: "0.1.0",
    schema_version: 1,
  },
  promotion_settings: { default_scope: "org", opt_out_global_propose: false, notes: null },
  policy_overrides: [{ domain: "industry", matched: 0.9, suggested: 0.6, notes: null }],
  field_locks: [{ field_key: "company_country", mode: "require_review", reason: null }],
  flow_pack_overrides: [],
};

describe("diffProfiles", () => {
  it("returns empty diff for identical profiles", () => {
    const diff = diffProfiles(BASE, structuredClone(BASE));
    expect(diff).toEqual([]);
    expect(summarizeDiff(diff)).toBe("no changes");
  });

  it("flags promotion_settings change", () => {
    const after: OrgConfigProfileV1 = {
      ...BASE,
      promotion_settings: { ...BASE.promotion_settings, default_scope: "global" },
    };
    const diff = diffProfiles(BASE, after);
    expect(diff).toHaveLength(1);
    expect(diff[0]?.section).toBe("promotion_settings");
    expect(diff[0]?.kind).toBe("changed");
  });

  it("flags added policy override", () => {
    const after: OrgConfigProfileV1 = {
      ...BASE,
      policy_overrides: [
        ...BASE.policy_overrides,
        { domain: "geo", matched: 0.95, suggested: 0.7, notes: null },
      ],
    };
    const diff = diffProfiles(BASE, after);
    expect(diff.some((d) => d.kind === "added" && d.key === "geo")).toBe(true);
  });

  it("flags removed field lock", () => {
    const after: OrgConfigProfileV1 = { ...BASE, field_locks: [] };
    const diff = diffProfiles(BASE, after);
    expect(diff.some((d) => d.kind === "removed" && d.key === "company_country")).toBe(true);
  });

  it("summarizeDiff counts kinds", () => {
    const after: OrgConfigProfileV1 = {
      ...BASE,
      policy_overrides: [
        ...BASE.policy_overrides,
        { domain: "geo", matched: 0.95, suggested: 0.7, notes: null },
      ],
      field_locks: [],
    };
    const diff = diffProfiles(BASE, after);
    expect(summarizeDiff(diff)).toMatch(/added|removed/);
  });
});
