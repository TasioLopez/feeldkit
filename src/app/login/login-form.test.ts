import { describe, expect, it } from "vitest";
import { buildMagicLinkRedirect, createMagicLinkOptions } from "./login-form";

describe("login-form helpers", () => {
  it("builds an admin callback redirect with a safe next path", () => {
    expect(
      buildMagicLinkRedirect({
        origin: "https://admin.feeldkit.dev/",
        callbackPath: "/auth/callback",
        nextPath: "/dashboard/promotions",
        defaultNextPath: "/dashboard",
      }),
    ).toBe("https://admin.feeldkit.dev/auth/callback?next=%2Fdashboard%2Fpromotions");
  });

  it("builds an app callback redirect without falling back to the admin callback path", () => {
    expect(
      buildMagicLinkRedirect({
        origin: "https://feeldkit.dev",
        callbackPath: "/auth/app/callback",
        nextPath: "/app",
        defaultNextPath: "/app",
      }),
    ).toBe("https://feeldkit.dev/auth/app/callback?next=%2Fapp");
  });

  it("falls back to the configured default next path for unsafe next values", () => {
    expect(
      buildMagicLinkRedirect({
        origin: "https://feeldkit.dev",
        callbackPath: "/auth/app/callback",
        nextPath: "https://evil.example",
        defaultNextPath: "/app",
      }),
    ).toBe("https://feeldkit.dev/auth/app/callback?next=%2Fapp");
  });

  it("marks admin login as existing-user only and app login as self-serve", () => {
    expect(createMagicLinkOptions({ redirectTo: "https://admin.feeldkit.dev/auth/callback", shouldCreateUser: false })).toEqual({
      emailRedirectTo: "https://admin.feeldkit.dev/auth/callback",
      shouldCreateUser: false,
    });
    expect(createMagicLinkOptions({ redirectTo: "https://feeldkit.dev/auth/app/callback", shouldCreateUser: true })).toEqual({
      emailRedirectTo: "https://feeldkit.dev/auth/app/callback",
      shouldCreateUser: true,
    });
  });
});
