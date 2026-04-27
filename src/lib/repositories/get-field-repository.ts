import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";
import type { IFieldRepository } from "@/lib/repositories/field-repository.interface";
import { StaticFieldRepository } from "@/lib/repositories/static-field-repository";
import { SupabaseFieldRepository } from "@/lib/repositories/supabase-field-repository";

let staticSingleton: StaticFieldRepository | null = null;
let supabaseSingleton: SupabaseFieldRepository | null = null;

export function getFieldRepository(): IFieldRepository {
  if (isSupabaseConfigured()) {
    const client = getSupabaseServiceClient();
    if (client) {
      if (!supabaseSingleton) {
        supabaseSingleton = new SupabaseFieldRepository(client);
      }
      return supabaseSingleton;
    }
  }
  if (!staticSingleton) {
    staticSingleton = new StaticFieldRepository();
  }
  return staticSingleton;
}
