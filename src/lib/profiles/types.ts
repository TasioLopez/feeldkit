/**
 * Phase 6 portable profile contracts. Two schemas: one for pre-deploy
 * simulation (`feeldkit.simulation_profile.v1`), one for cross-environment
 * governance config export/import (`feeldkit.org_config_profile.v1`).
 *
 * The canonical TS types also live in `@feeldkit/sdk` so external developers
 * get the same shapes; we re-export them here for the Next.js app.
 */
export type {
  SimulationProfileV1,
  FlowSimulationCase,
  FlowSimulationCaseAssertions,
  FlowSimulationCaseResult,
  FlowSimulationResponse,
  OrgConfigProfileV1,
  OrgConfigProfileImportResult,
} from "@/lib/api/types";

import type { OrgConfigProfileV1 } from "@/lib/api/types";

export const ORG_CONFIG_PROFILE_SCHEMA = "feeldkit.org_config_profile.v1" as const;
export const SIMULATION_PROFILE_SCHEMA = "feeldkit.simulation_profile.v1" as const;

export const ORG_CONFIG_PROFILE_SCHEMA_VERSION = 1 as const;

export type ProfileImportConflictReason =
  | "unknown_domain"
  | "flow_not_found"
  | "flow_version_not_found"
  | "invalid_thresholds"
  | "unknown_lock_mode";

export type ProfileImportConflict = {
  section: "policy_overrides" | "field_locks" | "flow_pack_overrides" | "promotion_settings";
  reason: ProfileImportConflictReason | string;
  detail?: Record<string, unknown>;
};

export type ProfileImportApplied = {
  promotion_settings: number;
  policy_overrides: number;
  field_locks: number;
  flow_pack_overrides: number;
};

export type ProfileImportArgs = {
  organizationId: string;
  actorId: string | null;
  profile: OrgConfigProfileV1;
  dryRun: boolean;
};

export type ProfileImportOutcome = {
  ok: boolean;
  dry_run: boolean;
  applied: ProfileImportApplied;
  conflicts: ProfileImportConflict[];
  audit_id: string | null;
};
