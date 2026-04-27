import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";

const lastFlush = new Map<string, number>();
const THROTTLE_MS = 5 * 60 * 1000;

export function touchApiKeyLastUsedThrottled(apiKeyId: string): void {
  const now = Date.now();
  const prev = lastFlush.get(apiKeyId) ?? 0;
  if (now - prev < THROTTLE_MS) {
    return;
  }
  lastFlush.set(apiKeyId, now);

  if (!isSupabaseConfigured()) {
    return;
  }

  const admin = getSupabaseServiceClient();
  if (!admin) {
    return;
  }

  void admin.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", apiKeyId);
}
