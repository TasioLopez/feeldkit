import { describe, expect, it } from "vitest";
import { assertAdminRole, assertPlatformAdminRole, isPlatformAdmin } from "@/lib/auth/admin-context";

describe("admin-context role gates", () => {
  it("admin and owner may pass assertAdminRole", () => {
    expect(() => assertAdminRole("admin")).not.toThrow();
    expect(() => assertAdminRole("owner")).not.toThrow();
  });

  it("platform_admin may also pass assertAdminRole", () => {
    expect(() => assertAdminRole("platform_admin")).not.toThrow();
  });

  it("viewer cannot pass assertAdminRole", () => {
    expect(() => assertAdminRole("viewer")).toThrow();
  });

  it("isPlatformAdmin recognizes only that role", () => {
    expect(isPlatformAdmin("platform_admin")).toBe(true);
    expect(isPlatformAdmin("admin")).toBe(false);
    expect(isPlatformAdmin("owner")).toBe(false);
  });

  it("assertPlatformAdminRole throws for org-level admins", () => {
    expect(() => assertPlatformAdminRole("admin")).toThrow();
    expect(() => assertPlatformAdminRole("owner")).toThrow();
    expect(() => assertPlatformAdminRole("platform_admin")).not.toThrow();
  });
});
