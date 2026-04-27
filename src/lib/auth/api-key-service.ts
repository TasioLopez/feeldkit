import { randomBytes, timingSafeEqual } from "node:crypto";
import {
  API_KEY_PREFIX_LENGTH,
  authenticateInMemoryApiKey,
  parseApiKey,
  sha256,
  type ApiScope,
  type StoredKey,
} from "@/lib/auth/api-key";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { env, isSupabaseConfigured } from "@/lib/config/env";

export function generateApiKey(): { fullKey: string; prefix: string; hash: string } {
  const raw = `fk_${randomBytes(24).toString("base64url")}`;
  const prefix = raw.slice(0, API_KEY_PREFIX_LENGTH);
  return { fullKey: raw, prefix, hash: sha256(raw) };
}

export async function authenticateApiKeyFromDatabase(rawKey: string): Promise<StoredKey | null> {
  const parsed = parseApiKey(rawKey);
  if (!parsed || !isSupabaseConfigured()) {
    return null;
  }

  const admin = getSupabaseServiceClient();
  if (!admin) {
    return null;
  }

  const { data, error } = await admin
    .from("api_keys")
    .select("id, organization_id, key_prefix, key_hash, scopes, revoked_at")
    .eq("key_prefix", parsed.keyPrefix)
    .is("revoked_at", null)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const left = Buffer.from(data.key_hash as string, "utf8");
  const right = Buffer.from(sha256(parsed.clearText), "utf8");
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    return null;
  }

  return {
    id: data.id as string,
    organizationId: data.organization_id as string,
    keyPrefix: data.key_prefix as string,
    keyHash: data.key_hash as string,
    scopes: (data.scopes as ApiScope[]) ?? [],
    revokedAt: (data.revoked_at as string | null) ?? null,
  };
}

export async function authenticateApiKey(rawKey: string): Promise<StoredKey | null> {
  const fromDb = await authenticateApiKeyFromDatabase(rawKey);
  if (fromDb) {
    return fromDb;
  }

  if (env.NODE_ENV === "production" && !env.ALLOW_DEMO_API_KEY) {
    return null;
  }

  return authenticateInMemoryApiKey(rawKey);
}
