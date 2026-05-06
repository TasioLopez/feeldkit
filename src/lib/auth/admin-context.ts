import { createSupabaseServerClient } from "@/lib/supabase/server-app";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";

export type AdminActorContext = {
  userId: string;
  organizationId: string;
  role: string;
  email: string | null;
};

export async function getAdminActorContext(): Promise<AdminActorContext | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }
  const userClient = await createSupabaseServerClient();
  if (!userClient) {
    return null;
  }
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user?.id) {
    return null;
  }

  const admin = getSupabaseServiceClient();
  if (!admin) {
    return null;
  }
  const { data: profile, error } = await admin
    .from("profiles")
    .select("organization_id, role, email")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error || !profile?.organization_id) {
    return null;
  }

  return {
    userId: user.id,
    organizationId: profile.organization_id as string,
    role: (profile.role as string) ?? "viewer",
    email: (profile.email as string | null) ?? user.email ?? null,
  };
}

export function assertAdminRole(role: string, action = "perform this action"): void {
  if (!["owner", "admin", "platform_admin"].includes(role)) {
    throw new Error(`Insufficient permissions to ${action}.`);
  }
}

/**
 * Cross-org curation (Phase 5 Wave 2). Used to gate curator queue endpoints
 * such as `POST /api/v1/admin/promotions/{id}/approve` so org-level admins
 * cannot promote another org's proposals to the global seed.
 */
export function isPlatformAdmin(role: string): boolean {
  return role === "platform_admin";
}

export function assertPlatformAdminRole(role: string, action = "curate global promotions"): void {
  if (!isPlatformAdmin(role)) {
    throw new Error(`Insufficient permissions to ${action}.`);
  }
}
