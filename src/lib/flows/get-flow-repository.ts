import { isSupabaseConfigured } from "@/lib/config/env";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import type { IFlowRepository } from "@/lib/flows/flow-repository.interface";
import { StaticFlowRepository } from "@/lib/flows/static-flow-repository";
import { SupabaseFlowRepository } from "@/lib/flows/supabase-flow-repository";

let staticSingleton: StaticFlowRepository | null = null;
let supabaseSingleton: SupabaseFlowRepository | null = null;

export function getFlowRepository(): IFlowRepository {
  if (isSupabaseConfigured()) {
    const client = getSupabaseServiceClient();
    if (client) {
      if (!supabaseSingleton) {
        supabaseSingleton = new SupabaseFlowRepository(client);
      }
      return supabaseSingleton;
    }
  }
  if (!staticSingleton) {
    staticSingleton = new StaticFlowRepository();
  }
  return staticSingleton;
}

/** Test/utility helper to swap in a custom implementation (in-memory or mock). */
export function setFlowRepositoryForTesting(repo: IFlowRepository | null): void {
  if (!repo) {
    staticSingleton = null;
    supabaseSingleton = null;
    return;
  }
  staticSingleton = repo as StaticFlowRepository;
  supabaseSingleton = repo as SupabaseFlowRepository;
}
