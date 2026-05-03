"use server";

import { revalidatePath } from "next/cache";
import { generateApiKey } from "@/lib/auth/api-key-service";
import { assertAdminRole, getAdminActorContext } from "@/lib/auth/admin-context";
import { ALL_API_KEY_SCOPES, type ApiScope } from "@/lib/auth/api-key";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

const ADMIN_SCOPES: ApiScope[] = ["admin:reviews", "admin:fields"];

async function getActorOrgAndRole(): Promise<{ organizationId: string; role: string } | null> {
  const ctx = await getAdminActorContext();
  if (!ctx) {
    return null;
  }
  return { organizationId: ctx.organizationId, role: ctx.role };
}

export async function getOrganizationContext(): Promise<{
  organizationId: string;
  organizationName: string | null;
  role: string;
} | null> {
  const ctx = await getActorOrgAndRole();
  if (!ctx) return null;
  const admin = getSupabaseServiceClient();
  if (!admin) {
    return { organizationId: ctx.organizationId, organizationName: null, role: ctx.role };
  }
  const { data } = await admin
    .from("organizations")
    .select("name")
    .eq("id", ctx.organizationId)
    .maybeSingle();
  return {
    organizationId: ctx.organizationId,
    organizationName: (data?.name as string | null) ?? null,
    role: ctx.role,
  };
}

export async function listApiKeysForOrganization(): Promise<
  Array<{ id: string; name: string; key_prefix: string; scopes: string[]; created_at: string; revoked_at: string | null }>
> {
  const ctx = await getActorOrgAndRole();
  if (!ctx || !["owner", "admin"].includes(ctx.role)) {
    return [];
  }
  const admin = getSupabaseServiceClient();
  if (!admin) {
    return [];
  }
  const { data, error } = await admin
    .from("api_keys")
    .select("id, name, key_prefix, scopes, created_at, revoked_at")
    .eq("organization_id", ctx.organizationId)
    .order("created_at", { ascending: false });
  if (error || !data) {
    return [];
  }
  return data as Array<{
    id: string;
    name: string;
    key_prefix: string;
    scopes: string[];
    created_at: string;
    revoked_at: string | null;
  }>;
}

export async function createApiKeyAction(input: {
  name: string;
  scopes: ApiScope[];
}): Promise<{ plaintextKey?: string; scopes?: ApiScope[]; error?: string }> {
  const trimmedName = input.name.trim();
  if (!trimmedName || trimmedName.length > 120) {
    return { error: "Name must be 1–120 characters." };
  }
  const ctx = await getActorOrgAndRole();
  if (!ctx) {
    return { error: "Not signed in or profile not ready." };
  }
  try {
    assertAdminRole(ctx.role, "manage API keys");
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Forbidden" };
  }
  const allowed = new Set<string>(ALL_API_KEY_SCOPES);
  const requestedScopes = Array.from(new Set(input.scopes ?? [])).filter((scope): scope is ApiScope =>
    allowed.has(scope),
  );
  if (requestedScopes.length === 0) {
    return { error: "Pick at least one scope." };
  }
  const wantsAdminScope = requestedScopes.some((scope) => ADMIN_SCOPES.includes(scope));
  if (wantsAdminScope && ctx.role !== "owner") {
    return { error: "Only owners can issue admin scopes." };
  }
  const admin = getSupabaseServiceClient();
  if (!admin) {
    return { error: "Server configuration error." };
  }
  const { fullKey, prefix, hash } = generateApiKey();
  const { error } = await admin.from("api_keys").insert({
    organization_id: ctx.organizationId,
    name: trimmedName,
    key_prefix: prefix,
    key_hash: hash,
    scopes: requestedScopes,
  });
  if (error) {
    return { error: error.message };
  }
  revalidatePath("/dashboard/api-keys");
  return { plaintextKey: fullKey, scopes: requestedScopes };
}

export async function revokeApiKeyAction(id: string): Promise<{ error?: string }> {
  const ctx = await getActorOrgAndRole();
  if (!ctx) {
    return { error: "Not signed in." };
  }
  try {
    assertAdminRole(ctx.role, "manage API keys");
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Forbidden" };
  }
  const admin = getSupabaseServiceClient();
  if (!admin) {
    return { error: "Server configuration error." };
  }
  const { error } = await admin
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organization_id", ctx.organizationId);
  if (error) {
    return { error: error.message };
  }
  revalidatePath("/dashboard/api-keys");
  return {};
}
