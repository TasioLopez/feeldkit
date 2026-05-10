import type { SupabaseClient } from "@supabase/supabase-js";
import type { OrgConfigProfileV1 } from "@/lib/api/types";
import { isDomainKey } from "@/lib/governance/types";
import { orgPolicyOverrideRowConsistent } from "@/lib/governance/policy-override-check";
import { getFlowRepository } from "@/lib/flows/get-flow-repository";
import { upsertOrgPromotionSettings } from "@/lib/promotion/repository";
import { writeAudit } from "@/lib/governance/audit";
import {
  ORG_CONFIG_PROFILE_SCHEMA,
  ORG_CONFIG_PROFILE_SCHEMA_VERSION,
  type ProfileImportApplied,
  type ProfileImportArgs,
  type ProfileImportConflict,
  type ProfileImportOutcome,
} from "@/lib/profiles/types";

const VALID_LOCK_MODES = new Set(["require_review", "disable_auto_apply"]);

function validateProfile(profile: OrgConfigProfileV1): { ok: true } | { ok: false; reason: string } {
  if (profile.schema !== ORG_CONFIG_PROFILE_SCHEMA) {
    return { ok: false, reason: `unsupported_schema:${profile.schema}` };
  }
  if (profile.manifest?.schema_version !== ORG_CONFIG_PROFILE_SCHEMA_VERSION) {
    return { ok: false, reason: `unsupported_schema_version:${profile.manifest?.schema_version}` };
  }
  return { ok: true };
}

export async function importOrgConfigProfile(
  admin: SupabaseClient,
  args: ProfileImportArgs,
): Promise<ProfileImportOutcome> {
  const validation = validateProfile(args.profile);
  if (!validation.ok) {
    return {
      ok: false,
      dry_run: args.dryRun,
      applied: emptyApplied(),
      conflicts: [{ section: "promotion_settings", reason: validation.reason }],
      audit_id: null,
    };
  }

  const conflicts: ProfileImportConflict[] = [];
  const applied: ProfileImportApplied = emptyApplied();
  const flows = getFlowRepository();

  // Resolve everything before writing so dry-run mirrors apply exactly.
  const flowKeyToPackId = new Map<string, string>();
  const flowKeyVersionToId = new Map<string, string>();
  for (const override of args.profile.flow_pack_overrides) {
    if (!flowKeyToPackId.has(override.flow_key)) {
      const pack = await flows.getFlowByKey(override.flow_key);
      if (!pack) {
        conflicts.push({
          section: "flow_pack_overrides",
          reason: "flow_not_found",
          detail: { flow_key: override.flow_key },
        });
        continue;
      }
      flowKeyToPackId.set(override.flow_key, pack.id);
    }
    if (override.action === "pin_version" && override.flow_pack_version) {
      const cacheKey = `${override.flow_key}::${override.flow_pack_version}`;
      if (!flowKeyVersionToId.has(cacheKey)) {
        const version = await flows.getFlowVersion(override.flow_key, override.flow_pack_version);
        if (!version) {
          conflicts.push({
            section: "flow_pack_overrides",
            reason: "flow_version_not_found",
            detail: { flow_key: override.flow_key, version: override.flow_pack_version },
          });
          continue;
        }
        flowKeyVersionToId.set(cacheKey, version.version.id);
      }
    }
  }

  for (const policy of args.profile.policy_overrides) {
    if (!isDomainKey(policy.domain)) {
      conflicts.push({
        section: "policy_overrides",
        reason: "unknown_domain",
        detail: { domain: policy.domain },
      });
      continue;
    }
    if (!orgPolicyOverrideRowConsistent(policy.matched, policy.suggested)) {
      conflicts.push({
        section: "policy_overrides",
        reason: "invalid_thresholds",
        detail: { domain: policy.domain, matched: policy.matched, suggested: policy.suggested },
      });
      continue;
    }
  }

  for (const lock of args.profile.field_locks) {
    if (!VALID_LOCK_MODES.has(lock.mode)) {
      conflicts.push({
        section: "field_locks",
        reason: "unknown_lock_mode",
        detail: { field_key: lock.field_key, mode: lock.mode },
      });
    }
  }

  if (args.dryRun) {
    return {
      ok: true,
      dry_run: true,
      applied: countPlanned(args.profile, flowKeyToPackId, conflicts),
      conflicts,
      audit_id: null,
    };
  }

  // Write phase. Errors are appended to conflicts but do not throw, so a partial
  // apply still surfaces what landed and what didn't.
  const before = await snapshotForAudit(admin, args.organizationId);

  const settingsResult = await upsertOrgPromotionSettings(admin, {
    organizationId: args.organizationId,
    optOutGlobalPropose: args.profile.promotion_settings.opt_out_global_propose,
    defaultScope: args.profile.promotion_settings.default_scope,
    notes: args.profile.promotion_settings.notes ?? null,
    actorId: args.actorId,
  });
  if (settingsResult.ok) applied.promotion_settings = 1;
  else
    conflicts.push({
      section: "promotion_settings",
      reason: settingsResult.error ?? "upsert_failed",
    });

  for (const policy of args.profile.policy_overrides) {
    if (!isDomainKey(policy.domain)) continue;
    if (!orgPolicyOverrideRowConsistent(policy.matched, policy.suggested)) continue;
    const { error } = await admin.from("org_policy_overrides").upsert(
      {
        organization_id: args.organizationId,
        domain: policy.domain,
        matched: policy.matched,
        suggested: policy.suggested,
        notes: policy.notes,
        updated_at: new Date().toISOString(),
        updated_by: args.actorId,
      },
      { onConflict: "organization_id,domain" },
    );
    if (error)
      conflicts.push({
        section: "policy_overrides",
        reason: error.message,
        detail: { domain: policy.domain },
      });
    else applied.policy_overrides++;
  }

  for (const lock of args.profile.field_locks) {
    if (!VALID_LOCK_MODES.has(lock.mode)) continue;
    const { error } = await admin.from("org_field_locks").upsert(
      {
        organization_id: args.organizationId,
        field_key: lock.field_key,
        mode: lock.mode,
        reason: lock.reason,
        created_by: args.actorId,
      },
      { onConflict: "organization_id,field_key" },
    );
    if (error)
      conflicts.push({
        section: "field_locks",
        reason: error.message,
        detail: { field_key: lock.field_key },
      });
    else applied.field_locks++;
  }

  // Replace flow_pack_overrides in full so the import is reproducible across
  // runs (otherwise stale rows would accumulate). Remove existing first.
  if (args.profile.flow_pack_overrides.length > 0) {
    const { error: clearErr } = await admin
      .from("flow_pack_overrides")
      .delete()
      .eq("organization_id", args.organizationId);
    if (clearErr) {
      conflicts.push({ section: "flow_pack_overrides", reason: clearErr.message });
    }
    for (const override of args.profile.flow_pack_overrides) {
      const flowPackId = flowKeyToPackId.get(override.flow_key);
      if (!flowPackId) continue;
      const versionId =
        override.flow_pack_version
          ? flowKeyVersionToId.get(`${override.flow_key}::${override.flow_pack_version}`) ?? null
          : null;
      const { error } = await admin.from("flow_pack_overrides").insert({
        organization_id: args.organizationId,
        flow_pack_id: flowPackId,
        flow_pack_version_id: versionId,
        ordinal: override.ordinal,
        action: override.action,
        payload: override.payload ?? {},
        notes: override.notes ?? null,
        created_by: args.actorId,
      });
      if (error)
        conflicts.push({
          section: "flow_pack_overrides",
          reason: error.message,
          detail: { flow_key: override.flow_key, ordinal: override.ordinal },
        });
      else applied.flow_pack_overrides++;
    }
  }

  const after = await snapshotForAudit(admin, args.organizationId);

  const audit_id = await writeAudit({
    organizationId: args.organizationId,
    actorId: args.actorId,
    action: "profile.import",
    entityType: "org_config_profile",
    entityId: null,
    before,
    after: { profile: args.profile, applied, conflicts },
  });

  return {
    ok: conflicts.length === 0,
    dry_run: false,
    applied,
    conflicts,
    audit_id,
  };
}

function emptyApplied(): ProfileImportApplied {
  return { promotion_settings: 0, policy_overrides: 0, field_locks: 0, flow_pack_overrides: 0 };
}

function countPlanned(
  profile: OrgConfigProfileV1,
  flowPackResolved: Map<string, string>,
  conflicts: ProfileImportConflict[],
): ProfileImportApplied {
  const conflictsBySection = new Map<string, number>();
  for (const c of conflicts) {
    conflictsBySection.set(c.section, (conflictsBySection.get(c.section) ?? 0) + 1);
  }
  return {
    promotion_settings: 1,
    policy_overrides: profile.policy_overrides.length - (conflictsBySection.get("policy_overrides") ?? 0),
    field_locks: profile.field_locks.length - (conflictsBySection.get("field_locks") ?? 0),
    flow_pack_overrides: profile.flow_pack_overrides.filter((o) => flowPackResolved.has(o.flow_key)).length,
  };
}

async function snapshotForAudit(
  admin: SupabaseClient,
  organizationId: string,
): Promise<Record<string, unknown>> {
  const [policy, locks, flowOverrides, settings] = await Promise.all([
    admin
      .from("org_policy_overrides")
      .select("*")
      .eq("organization_id", organizationId),
    admin.from("org_field_locks").select("*").eq("organization_id", organizationId),
    admin.from("flow_pack_overrides").select("*").eq("organization_id", organizationId),
    admin
      .from("org_promotion_settings")
      .select("*")
      .eq("organization_id", organizationId)
      .maybeSingle(),
  ]);
  return {
    policy_overrides: policy.data ?? [],
    field_locks: locks.data ?? [],
    flow_pack_overrides: flowOverrides.data ?? [],
    promotion_settings: settings.data ?? null,
  };
}
