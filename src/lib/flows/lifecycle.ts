import type { SupabaseClient } from "@supabase/supabase-js";
import { writeAudit } from "@/lib/governance/audit";

export async function retireFlowPackVersion(
  admin: SupabaseClient,
  opts: {
    flowKey: string;
    version: string;
    organizationId: string | null;
    actorId: string | null;
  },
): Promise<{ ok: boolean; error?: string }> {
  const { data: pack } = await admin.from("flow_packs").select("id").eq("key", opts.flowKey).maybeSingle();
  if (!pack?.id) return { ok: false, error: "flow_not_found" };

  const { data: ver } = await admin
    .from("flow_pack_versions")
    .select("id")
    .eq("flow_pack_id", pack.id as string)
    .eq("version", opts.version)
    .maybeSingle();
  if (!ver?.id) return { ok: false, error: "version_not_found" };

  await writeAudit({
    organizationId: opts.organizationId,
    actorId: opts.actorId,
    action: "flow.retire",
    entityType: "flow_pack_versions",
    entityId: ver.id as string,
    before: { flow_key: opts.flowKey, version: opts.version },
    after: { lifecycle: "retired" },
  });

  const { error } = await admin
    .from("flow_pack_versions")
    .update({
      lifecycle: "retired",
      retired_at: new Date().toISOString(),
      is_active: false,
    })
    .eq("id", ver.id as string);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function rollbackFlowToVersion(
  admin: SupabaseClient,
  opts: {
    flowKey: string;
    targetVersion: string;
    organizationId: string | null;
    actorId: string | null;
  },
): Promise<{ ok: boolean; error?: string }> {
  const { data: pack } = await admin.from("flow_packs").select("id").eq("key", opts.flowKey).maybeSingle();
  if (!pack?.id) return { ok: false, error: "flow_not_found" };

  const { data: target } = await admin
    .from("flow_pack_versions")
    .select("id")
    .eq("flow_pack_id", pack.id as string)
    .eq("version", opts.targetVersion)
    .maybeSingle();
  if (!target?.id) return { ok: false, error: "version_not_found" };

  await writeAudit({
    organizationId: opts.organizationId,
    actorId: opts.actorId,
    action: "flow.rollback",
    entityType: "flow_packs",
    entityId: pack.id as string,
    before: { flow_key: opts.flowKey },
    after: { active_version: opts.targetVersion },
  });

  await admin
    .from("flow_pack_versions")
    .update({ is_active: false })
    .eq("flow_pack_id", pack.id as string);

  const now = new Date().toISOString();
  const { error: promoteErr } = await admin
    .from("flow_pack_versions")
    .update({
      is_active: true,
      lifecycle: "published",
      retired_at: null,
      published_at: now,
    })
    .eq("id", target.id as string);
  if (promoteErr) return { ok: false, error: promoteErr.message };

  return { ok: true };
}
