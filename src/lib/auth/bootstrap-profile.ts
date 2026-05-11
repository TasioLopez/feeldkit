import type { User } from "@supabase/supabase-js";
import { isAdminEmailAllowed } from "@/lib/auth/admin-allowlist";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

/**
 * Ensures a `profiles` row and default `organizations` exist for a new auth user.
 * Uses service role (server-only) to bypass RLS.
 */
export async function ensureProfileForUser(user: User): Promise<void> {
  const admin = getSupabaseServiceClient();
  if (!admin || !user.id) {
    return;
  }
  if (!isAdminEmailAllowed(user.email)) {
    console.warn("ensureProfileForUser: denied bootstrap for non-allowlisted email");
    return;
  }

  const { data: existing } = await admin
    .from("profiles")
    .select("id, organization_id, default_organization_id, role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing?.default_organization_id || existing?.organization_id) {
    const organizationId = (existing.default_organization_id as string | null) ?? (existing.organization_id as string | null);
    if (!organizationId) {
      return;
    }
    const legacyRole = existing.role === "admin" || existing.role === "viewer" ? existing.role : "owner";
    await admin.from("organization_memberships").upsert(
      {
        organization_id: organizationId,
        user_id: user.id,
        role: legacyRole,
        status: "active",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "organization_id,user_id" },
    );
    return;
  }

  const email = user.email ?? "user@unknown.local";
  const slugBase = email.split("@")[0]?.replace(/[^a-z0-9-]/gi, "-").toLowerCase() || "org";
  const slug = `${slugBase}-${user.id.replace(/-/g, "").slice(0, 12)}`;

  const { data: org, error: orgError } = await admin
    .from("organizations")
    .insert({ name: `${email} organization`, slug })
    .select("id")
    .single();

  if (orgError || !org) {
    console.error("ensureProfileForUser: organization insert failed", orgError);
    return;
  }

  const profilePayload = {
    user_id: user.id,
    email,
    organization_id: org.id,
    default_organization_id: org.id,
    full_name: user.user_metadata?.full_name ?? null,
    platform_role: "none",
    role: "owner",
  };

  const profileWrite = existing
    ? admin.from("profiles").update(profilePayload).eq("user_id", user.id)
    : admin.from("profiles").insert(profilePayload);
  const { error: profileError } = await profileWrite;

  if (profileError) {
    console.error("ensureProfileForUser: profile insert failed", profileError);
    return;
  }

  const { error: membershipError } = await admin.from("organization_memberships").upsert(
    {
      organization_id: org.id,
      user_id: user.id,
      role: "owner",
      status: "active",
    },
    { onConflict: "organization_id,user_id" },
  );

  if (membershipError) {
    console.error("ensureProfileForUser: membership upsert failed", membershipError);
  }
}
