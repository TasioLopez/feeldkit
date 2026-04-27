import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";

export interface UsageEventInput {
  organizationId: string | null;
  apiKeyId: string;
  endpoint: string;
  fieldKey: string | null;
}

const memoryUsage: UsageEventInput[] = [];

export async function logUsageEvent(event: UsageEventInput): Promise<void> {
  if (isSupabaseConfigured()) {
    const admin = getSupabaseServiceClient();
    if (admin) {
      const { error } = await admin.from("usage_events").insert({
        organization_id: event.organizationId,
        api_key_id: event.apiKeyId,
        endpoint: event.endpoint,
        field_key: event.fieldKey,
        request_count: 1,
      });
      if (error) {
        console.error("usage_events insert failed", error.message);
      }
      return;
    }
  }
  memoryUsage.push(event);
  if (memoryUsage.length > 10_000) {
    memoryUsage.splice(0, memoryUsage.length - 5000);
  }
}

export function getMemoryUsageEvents(): UsageEventInput[] {
  return [...memoryUsage].reverse();
}
