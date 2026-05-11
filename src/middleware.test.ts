import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

function request(url: string, host: string) {
  return new NextRequest(url, {
    headers: { host },
  });
}

async function loadMiddleware() {
  vi.resetModules();
  vi.doMock("@/lib/config/env", () => ({
    env: {
      ADMIN_HOST: "admin.feeldkit.dev",
      APP_SITE_URL: "https://feeldkit.dev",
      NODE_ENV: "production",
    },
    isSupabaseConfigured: () => false,
  }));
  vi.doMock("@/lib/supabase/middleware", () => ({
    updateSession: vi.fn(),
  }));
  return import("./middleware");
}

describe("middleware surface routing", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps /dashboard admin-host only", async () => {
    const { middleware } = await loadMiddleware();
    const response = await middleware(request("https://feeldkit.dev/dashboard", "feeldkit.dev"));
    expect(response.status).toBe(404);
    expect(response.headers.get("x-middleware-rewrite")).toBe("https://feeldkit.dev/__feeldkit_not_found");
  });

  it("keeps /login admin-host only", async () => {
    const { middleware } = await loadMiddleware();
    const response = await middleware(request("https://feeldkit.dev/login", "feeldkit.dev"));
    expect(response.status).toBe(404);
    expect(response.headers.get("x-middleware-rewrite")).toBe("https://feeldkit.dev/__feeldkit_not_found");
  });

  it("keeps admin auth callback admin-host only", async () => {
    const { middleware } = await loadMiddleware();
    const response = await middleware(request("https://feeldkit.dev/auth/callback", "feeldkit.dev"));
    expect(response.status).toBe(404);
    expect(response.headers.get("x-middleware-rewrite")).toBe("https://feeldkit.dev/__feeldkit_not_found");
  });

  it("redirects admin-host root to admin login", async () => {
    const { middleware } = await loadMiddleware();
    const response = await middleware(request("https://admin.feeldkit.dev/", "admin.feeldkit.dev"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://admin.feeldkit.dev/login");
  });

  it("keeps /app off the admin host", async () => {
    const { middleware } = await loadMiddleware();
    const response = await middleware(request("https://admin.feeldkit.dev/app", "admin.feeldkit.dev"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://feeldkit.dev/app");
  });

  it("redirects unauthenticated app requests to app login", async () => {
    const { middleware } = await loadMiddleware();
    const response = await middleware(request("https://feeldkit.dev/app", "feeldkit.dev"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://feeldkit.dev/app/login?next=%2Fapp");
  });
});
