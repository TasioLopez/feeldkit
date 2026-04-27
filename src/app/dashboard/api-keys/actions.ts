"use server";

import { revalidatePath } from "next/cache";
import { generateApiKey } from "@/lib/auth/api-key-service";
import { createSupabaseServerClient } from "@/lib/supabase/server-app";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";

const DEFAULT_SCOPES = ["read:packs", "read:fields", "normalize", "validate", "parse"];

async function getActorOrgAndRole(): Promise<{ organizationId: string; role: string } | null> {
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
  if (!user) {
    return null;
  }
  const admin = getSupabaseServiceClient();
  if (!admin) {
    return null;
  }
  const { data: profile, error } = await admin
    .from("profiles")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error || !profile?.organization_id) {
    return null;
  }
  return { organizationId: profile.organization_id as string, role: profile.role as string };
}

function assertCanManageKeys(role: string): void {
  if (!["owner", "admin"].includes(role)) {
    throw new Error("Insufficient permissions to manage API keys.");
  }
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

export async function createApiKeyAction(name: string): Promise<{ plaintextKey?: string; error?: string }> {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 120) {
    return { error: "Name must be 1–120 characters." };
  }
  const ctx = await getActorOrgAndRole();
  if (!ctx) {
    return { error: "Not signed in or profile not ready." };
  }
  try {
    assertCanManageKeys(ctx.role);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Forbidden" };
  }
  const admin = getSupabaseServiceClient();
  if (!admin) {
    return { error: "Server configuration error." };
  }
  const { fullKey, prefix, hash } = generateApiKey();
  const { error } = await admin.from("api_keys").insert({
    organization_id: ctx.organizationId,
    name: trimmed,
    key_prefix: prefix,
    key_hash: hash,
    scopes: DEFAULT_SCOPES,
  });
  if (error) {
    return { error: error.message };
  }
  revalidatePath("/dashboard/api-keys");
  return { plaintextKey: fullKey };
}

export async function revokeApiKeyAction(id: string): Promise<{ error?: string }> {
  const ctx = await getActorOrgAndRole();
  if (!ctx) {
    return { error: "Not signed in." };
  }
  try {
    assertCanManageKeys(ctx.role);
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
