import type { User } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

let adminAllowed = false;
let serviceClient: unknown = null;

vi.mock("@/lib/auth/admin-allowlist", () => ({
  isAdminEmailAllowed: () => adminAllowed,
}));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServiceClient: () => serviceClient,
}));

import { ensureAdminProfileForUser, ensureAppProfileForUser } from "@/lib/auth/bootstrap-profile";

const user = {
  id: "user-1",
  email: "user@example.com",
  user_metadata: { full_name: "Example User" },
} as unknown as User;

describe("bootstrap-profile", () => {
  beforeEach(() => {
    adminAllowed = false;
    serviceClient = null;
  });

  it("does not bootstrap admin profiles for non-allowlisted emails", async () => {
    const from = vi.fn();
    serviceClient = { from };

    await ensureAdminProfileForUser(user);

    expect(from).not.toHaveBeenCalled();
  });

  it("repairs app memberships without requiring admin allowlist", async () => {
    const membershipUpsert = vi.fn(async () => ({ error: null }));
    serviceClient = {
      from(table: string) {
        if (table === "profiles") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: "profile-1",
                    organization_id: null,
                    default_organization_id: "org-1",
                    role: "viewer",
                  },
                }),
              }),
            }),
          };
        }
        if (table === "organization_memberships") {
          return { upsert: membershipUpsert };
        }
        throw new Error(`unexpected table ${table}`);
      },
    };

    await ensureAppProfileForUser(user);

    expect(membershipUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        organization_id: "org-1",
        user_id: "user-1",
        role: "viewer",
        status: "active",
      }),
      { onConflict: "organization_id,user_id" },
    );
  });

  it("creates app profiles with no platform role and an owner membership", async () => {
    const profileInsert = vi.fn(async () => ({ error: null }));
    const membershipUpsert = vi.fn(async () => ({ error: null }));
    serviceClient = {
      from(table: string) {
        if (table === "profiles") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: null }),
              }),
            }),
            insert: profileInsert,
          };
        }
        if (table === "organizations") {
          return {
            insert: () => ({
              select: () => ({
                single: async () => ({ data: { id: "org-1" }, error: null }),
              }),
            }),
          };
        }
        if (table === "organization_memberships") {
          return { upsert: membershipUpsert };
        }
        throw new Error(`unexpected table ${table}`);
      },
    };

    await ensureAppProfileForUser(user);

    expect(profileInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        platform_role: "none",
        role: "owner",
        default_organization_id: "org-1",
      }),
    );
    expect(membershipUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        organization_id: "org-1",
        user_id: "user-1",
        role: "owner",
        status: "active",
      }),
      { onConflict: "organization_id,user_id" },
    );
  });
});
