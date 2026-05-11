import { describe, expect, it } from "vitest";
import {
  assertAdminRole,
  assertOrgOwner,
  assertPlatformAdminRole,
  canCurateGlobalPromotions,
  canIssueAdminApiScopes,
  isPlatformAdmin,
} from "@/lib/auth/admin-context";

describe("admin-context role gates", () => {
  it("admin and owner may pass org admin checks", () => {
    expect(() => assertAdminRole("admin")).not.toThrow();
    expect(() => assertAdminRole("owner")).not.toThrow();
  });

  it("viewer and editor cannot pass org admin checks", () => {
    expect(() => assertAdminRole("viewer")).toThrow();
    expect(() => assertAdminRole("editor")).toThrow();
  });

  it("only org owners may issue admin-scoped API keys", () => {
    expect(canIssueAdminApiScopes("owner")).toBe(true);
    expect(canIssueAdminApiScopes("admin")).toBe(false);
    expect(canIssueAdminApiScopes("viewer")).toBe(false);
  });

  it("assertOrgOwner throws for non-owner org roles", () => {
    expect(() => assertOrgOwner("owner")).not.toThrow();
    expect(() => assertOrgOwner("admin")).toThrow();
  });

  it("platform curation uses platform roles, not org roles", () => {
    expect(isPlatformAdmin("platform_admin")).toBe(true);
    expect(isPlatformAdmin("super_admin")).toBe(true);
    expect(isPlatformAdmin("admin")).toBe(false);
    expect(isPlatformAdmin("owner")).toBe(false);
  });

  it("assertPlatformAdminRole throws for org-level admins", () => {
    expect(() => assertPlatformAdminRole("admin")).toThrow();
    expect(() => assertPlatformAdminRole("owner")).toThrow();
    expect(() => assertPlatformAdminRole("platform_admin")).not.toThrow();
  });

  it("platform admin without org owner cannot silently issue org admin keys", () => {
    expect(canCurateGlobalPromotions("platform_admin")).toBe(true);
    expect(canIssueAdminApiScopes("admin")).toBe(false);
  });

  it("org owner without platform role cannot approve global promotions", () => {
    expect(canIssueAdminApiScopes("owner")).toBe(true);
    expect(canCurateGlobalPromotions("none")).toBe(false);
  });
});
