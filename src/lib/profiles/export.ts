import type { SupabaseClient } from "@supabase/supabase-js";
import type { OrgConfigProfileV1 } from "@/lib/api/types";
import { getGovernanceRepository } from "@/lib/governance/get-governance-repository";
import { getFlowRepository } from "@/lib/flows/get-flow-repository";
import { getOrgPromotionSettings } from "@/lib/promotion/repository";
import {
  ORG_CONFIG_PROFILE_SCHEMA,
  ORG_CONFIG_PROFILE_SCHEMA_VERSION,
} from "@/lib/profiles/types";
import { getAppVersion } from "@/lib/profiles/version";

export async function exportOrgConfigProfile(
  admin: SupabaseClient,
  organizationId: string,
): Promise<OrgConfigProfileV1> {
  const governance = getGovernanceRepository();
  const flows = getFlowRepository();

  const [policyOverrides, fieldLocks, flowOverrides, promotionSettings] = await Promise.all([
    governance.listOrgPolicyOverrides(organizationId),
    governance.listOrgFieldLocks(organizationId),
    governance.listFlowPackOverrides(organizationId),
    getOrgPromotionSettings(admin, organizationId),
  ]);

  const flowPackIdToKey = new Map<string, string>();
  const flowVersionIdToVersion = new Map<string, string>();
  for (const override of flowOverrides) {
    if (!flowPackIdToKey.has(override.flowPackId)) {
      const { data } = await admin
        .from("flow_packs")
        .select("id, key")
        .eq("id", override.flowPackId)
        .maybeSingle();
      flowPackIdToKey.set(override.flowPackId, (data?.key as string | undefined) ?? "");
    }
    if (override.flowPackVersionId && !flowVersionIdToVersion.has(override.flowPackVersionId)) {
      const versionEntry = await flows.getFlowVersionById(override.flowPackVersionId);
      if (versionEntry) {
        flowVersionIdToVersion.set(override.flowPackVersionId, versionEntry.version.version);
      }
    }
  }

  const profile: OrgConfigProfileV1 = {
    schema: ORG_CONFIG_PROFILE_SCHEMA,
    manifest: {
      exported_at: new Date().toISOString(),
      source_organization_id: organizationId,
      feeldkit_app_version: getAppVersion(),
      schema_version: ORG_CONFIG_PROFILE_SCHEMA_VERSION,
    },
    promotion_settings: {
      default_scope: promotionSettings.defaultScope,
      opt_out_global_propose: promotionSettings.optOutGlobalPropose,
      notes: promotionSettings.notes,
    },
    policy_overrides: policyOverrides.map((row) => ({
      domain: row.domain,
      matched: row.matched,
      suggested: row.suggested,
      notes: row.notes,
    })),
    field_locks: fieldLocks.map((row) => ({
      field_key: row.fieldKey,
      mode: row.mode,
      reason: row.reason,
    })),
    flow_pack_overrides: flowOverrides
      .map((row) => {
        const flowKey = flowPackIdToKey.get(row.flowPackId);
        if (!flowKey) return null;
        const flowPackVersion = row.flowPackVersionId
          ? flowVersionIdToVersion.get(row.flowPackVersionId) ?? null
          : null;
        return {
          flow_key: flowKey,
          flow_pack_version: flowPackVersion,
          ordinal: row.ordinal,
          action: row.action,
          payload: row.payload,
          notes: row.notes,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null),
  };

  return profile;
}
