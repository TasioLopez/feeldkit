import type { User } from "@supabase/supabase-js";
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

  const { data: existing } = await admin.from("profiles").select("id").eq("user_id", user.id).maybeSingle();
  if (existing) {
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

  const { error: profileError } = await admin.from("profiles").insert({
    user_id: user.id,
    email,
    organization_id: org.id,
    full_name: user.user_metadata?.full_name ?? null,
    role: "owner",
  });

  if (profileError) {
    console.error("ensureProfileForUser: profile insert failed", profileError);
  }
}
