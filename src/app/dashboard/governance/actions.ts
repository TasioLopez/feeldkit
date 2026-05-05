"use server";

import { revalidatePath } from "next/cache";
import { assertAdminRole, getAdminActorContext } from "@/lib/auth/admin-context";
import { writeAudit } from "@/lib/governance/audit";
import { isDomainKey } from "@/lib/governance/types";
import { orgPolicyOverrideRowConsistent } from "@/lib/governance/policy-override-check";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export async function upsertOrgPolicyOverrideAction(formData: FormData): Promise<void> {
  const actor = await getAdminActorContext();
  if (!actor) return;
  try {
    assertAdminRole(actor.role, "edit governance policy");
  } catch {
    return;
  }
  const domain = String(formData.get("domain") ?? "").trim();
  const matched = Number(formData.get("matched"));
  const suggested = Number(formData.get("suggested"));
  const notes = String(formData.get("notes") ?? "").trim() || null;
  if (!isDomainKey(domain) || !orgPolicyOverrideRowConsistent(matched, suggested)) return;

  const admin = getSupabaseServiceClient();
  if (!admin) return;

  await writeAudit({
    organizationId: actor.organizationId,
    actorId: actor.userId,
    action: "policy.update",
    entityType: "org_policy_overrides",
    entityId: null,
    after: { domain, matched, suggested, notes },
  });

  await admin.from("org_policy_overrides").upsert(
    {
      organization_id: actor.organizationId,
      domain,
      matched,
      suggested,
      notes,
      updated_at: new Date().toISOString(),
      updated_by: actor.userId,
    },
    { onConflict: "organization_id,domain" },
  );
  revalidatePath("/dashboard/governance");
}

export async function upsertOrgFieldLockAction(formData: FormData): Promise<void> {
  const actor = await getAdminActorContext();
  if (!actor) return;
  try {
    assertAdminRole(actor.role, "edit field locks");
  } catch {
    return;
  }
  const fieldKey = String(formData.get("field_key") ?? "").trim();
  const mode = String(formData.get("mode") ?? "").trim() as "require_review" | "disable_auto_apply";
  const reason = String(formData.get("reason") ?? "").trim() || null;
  if (!fieldKey || !["require_review", "disable_auto_apply"].includes(mode)) return;

  const admin = getSupabaseServiceClient();
  if (!admin) return;

  await writeAudit({
    organizationId: actor.organizationId,
    actorId: actor.userId,
    action: "field_lock.update",
    entityType: "org_field_locks",
    entityId: null,
    after: { field_key: fieldKey, mode, reason },
  });

  await admin.from("org_field_locks").upsert(
    {
      organization_id: actor.organizationId,
      field_key: fieldKey,
      mode,
      reason,
      created_by: actor.userId,
    },
    { onConflict: "organization_id,field_key" },
  );
  revalidatePath("/dashboard/governance");
}
