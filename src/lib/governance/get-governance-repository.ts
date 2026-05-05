import { isSupabaseConfigured } from "@/lib/config/env";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import type { IGovernanceRepository } from "@/lib/governance/governance-repository.interface";
import { StaticGovernanceRepository } from "@/lib/governance/static-governance-repository";
import { SupabaseGovernanceRepository } from "@/lib/governance/supabase-governance-repository";

let staticSingleton: StaticGovernanceRepository | null = null;
let supabaseSingleton: SupabaseGovernanceRepository | null = null;

export function getGovernanceRepository(): IGovernanceRepository {
  if (isSupabaseConfigured()) {
    const client = getSupabaseServiceClient();
    if (client) {
      if (!supabaseSingleton) {
        supabaseSingleton = new SupabaseGovernanceRepository(client);
      }
      return supabaseSingleton;
    }
  }
  if (!staticSingleton) {
    staticSingleton = new StaticGovernanceRepository();
  }
  return staticSingleton;
}

export function setGovernanceRepositoryForTesting(repo: IGovernanceRepository | null): void {
  if (!repo) {
    staticSingleton = null;
    supabaseSingleton = null;
    return;
  }
  staticSingleton = repo as StaticGovernanceRepository;
  supabaseSingleton = repo as SupabaseGovernanceRepository;
}
