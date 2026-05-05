"use server";

import { revalidatePath } from "next/cache";
import { assertAdminRole, getAdminActorContext } from "@/lib/auth/admin-context";
import { retireFlowPackVersion, rollbackFlowToVersion } from "@/lib/flows/lifecycle";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export async function retireFlowVersionDashboardAction(flowKey: string, version: string): Promise<void> {
  const actor = await getAdminActorContext();
  if (!actor) return;
  try {
    assertAdminRole(actor.role, "retire flow versions");
  } catch {
    return;
  }
  const admin = getSupabaseServiceClient();
  if (!admin) return;
  await retireFlowPackVersion(admin, {
    flowKey,
    version,
    organizationId: actor.organizationId,
    actorId: actor.userId,
  });
  revalidatePath(`/dashboard/flows/${flowKey}`);
}

export async function rollbackFlowFormAction(formData: FormData): Promise<void> {
  const flowKey = String(formData.get("flow_key") ?? "").trim();
  const targetVersion = String(formData.get("target_version") ?? "").trim();
  if (!flowKey || !targetVersion) return;
  await rollbackFlowDashboardAction(flowKey, targetVersion);
}

export async function retireFlowFormAction(formData: FormData): Promise<void> {
  const flowKey = String(formData.get("flow_key") ?? "").trim();
  const version = String(formData.get("version") ?? "").trim();
  if (!flowKey || !version) return;
  await retireFlowVersionDashboardAction(flowKey, version);
}

export async function rollbackFlowDashboardAction(flowKey: string, targetVersion: string): Promise<void> {
  const actor = await getAdminActorContext();
  if (!actor) return;
  try {
    assertAdminRole(actor.role, "rollback flow versions");
  } catch {
    return;
  }
  const admin = getSupabaseServiceClient();
  if (!admin) return;
  await rollbackFlowToVersion(admin, {
    flowKey,
    targetVersion,
    organizationId: actor.organizationId,
    actorId: actor.userId,
  });
  revalidatePath(`/dashboard/flows/${flowKey}`);
}
