import { createSupabaseServerClient } from "@/lib/supabase/server-app";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";

export type PlatformRole = "none" | "platform_admin" | "super_admin";
export type OrgRole = "owner" | "admin" | "editor" | "viewer";

export type ActorContext = {
  userId: string;
  organizationId: string;
  membershipId: string | null;
  /** @deprecated Use orgRole for org-scoped checks. */
  role: OrgRole;
  orgRole: OrgRole;
  platformRole: PlatformRole;
  email: string | null;
};

export type AdminActorContext = ActorContext;

const ORG_ROLE_ORDER: Record<OrgRole, number> = {
  viewer: 0,
  editor: 1,
  admin: 2,
  owner: 3,
};

function toPlatformRole(value: unknown): PlatformRole {
  return value === "platform_admin" || value === "super_admin" ? value : "none";
}

function toOrgRole(value: unknown): OrgRole {
  return value === "owner" || value === "admin" || value === "editor" || value === "viewer"
    ? value
    : "viewer";
}

export async function getActorContext(): Promise<ActorContext | null> {
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
    .select("organization_id, default_organization_id, role, platform_role, email")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error || !profile) {
    return null;
  }

  const fallbackOrganizationId =
    (profile.default_organization_id as string | null) ??
    (profile.organization_id as string | null) ??
    null;

  let membershipQuery = admin
    .from("organization_memberships")
    .select("id, organization_id, role, status")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1);

  if (fallbackOrganizationId) {
    membershipQuery = membershipQuery.eq("organization_id", fallbackOrganizationId);
  }

  const { data: memberships } = await membershipQuery;
  const membership = memberships?.[0] ?? null;
  const organizationId =
    (membership?.organization_id as string | undefined) ??
    fallbackOrganizationId;

  if (!organizationId) {
    return null;
  }

  if (fallbackOrganizationId && !membership) {
    await admin.from("organization_memberships").upsert(
      {
        organization_id: fallbackOrganizationId,
        user_id: user.id,
        role: toOrgRole(profile.role),
        status: "active",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "organization_id,user_id" },
    );
  }

  const { data: resolvedMembership } = await admin
    .from("organization_memberships")
    .select("id, role")
    .eq("user_id", user.id)
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .maybeSingle();

  const legacyRole = toOrgRole(profile.role);
  const orgRole = toOrgRole(resolvedMembership?.role ?? membership?.role ?? legacyRole);

  return {
    userId: user.id,
    organizationId,
    membershipId: (resolvedMembership?.id as string | null | undefined) ?? (membership?.id as string | null | undefined) ?? null,
    role: orgRole,
    orgRole,
    platformRole: toPlatformRole(profile.platform_role),
    email: (profile.email as string | null) ?? user.email ?? null,
  };
}

export async function getAdminActorContext(): Promise<AdminActorContext | null> {
  return getActorContext();
}

export function hasOrgRole(role: OrgRole | string | null | undefined, minimum: OrgRole): boolean {
  const resolved = toOrgRole(role);
  return ORG_ROLE_ORDER[resolved] >= ORG_ROLE_ORDER[minimum];
}

export function assertOrgRole(role: OrgRole | string, minimum: OrgRole, action = "perform this action"): void {
  if (!hasOrgRole(role, minimum)) {
    throw new Error(`Insufficient permissions to ${action}.`);
  }
}

export function assertOrgOwner(role: OrgRole | string, action = "perform this action"): void {
  assertOrgRole(role, "owner", action);
}

export function canManageApiKeys(role: OrgRole | string | null | undefined): boolean {
  return hasOrgRole(role, "admin");
}

export function canIssueAdminApiScopes(role: OrgRole | string | null | undefined): boolean {
  return toOrgRole(role) === "owner";
}

export function assertAdminRole(role: OrgRole | string, action = "perform this action"): void {
  assertOrgRole(role, "admin", action);
}

/**
 * Cross-org curation (Phase 5 Wave 2). Used to gate curator queue endpoints
 * such as `POST /api/v1/admin/promotions/{id}/approve` so org-level admins
 * cannot promote another org's proposals to the global seed.
 */
export function isPlatformAdmin(role: PlatformRole | string | null | undefined): boolean {
  return role === "platform_admin" || role === "super_admin";
}

export function assertPlatformAdminRole(
  role: PlatformRole | string | null | undefined,
  action = "curate global promotions",
): void {
  if (!isPlatformAdmin(role)) {
    throw new Error(`Insufficient permissions to ${action}.`);
  }
}

export function assertSuperAdmin(role: PlatformRole | string | null | undefined, action = "perform this action"): void {
  if (role !== "super_admin") {
    throw new Error(`Insufficient permissions to ${action}.`);
  }
}

export function canCurateGlobalPromotions(role: PlatformRole | string | null | undefined): boolean {
  return isPlatformAdmin(role);
}
