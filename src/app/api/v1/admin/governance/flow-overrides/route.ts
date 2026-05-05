import { NextResponse } from "next/server";
import { z } from "zod";
import { createScopedHandler } from "@/lib/api/endpoint";
import { writeAudit } from "@/lib/governance/audit";
import { getFlowRepository } from "@/lib/flows/get-flow-repository";
import { getGovernanceRepository } from "@/lib/governance/get-governance-repository";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export const GET = createScopedHandler("admin:policies", async (request) => {
  const organizationId = request.headers.get("x-feeldkit-organization-id");
  if (!organizationId) {
    return NextResponse.json({ error: "API key is not scoped to an organization" }, { status: 400 });
  }

  const url = new URL(request.url);
  const flowKey = url.searchParams.get("flow_key")?.trim() ?? "";

  const governance = getGovernanceRepository();
  const flows = getFlowRepository();

  if (!flowKey) {
    const overrides = await governance.listFlowPackOverrides(organizationId);
    return NextResponse.json({ organization_id: organizationId, flow_key: null, overrides });
  }

  const pack = await flows.getFlowByKey(flowKey);
  if (!pack) {
    return NextResponse.json({ error: "flow_not_found" }, { status: 404 });
  }

  const overrides = await governance.listFlowPackOverrides(organizationId, pack.id);
  return NextResponse.json({
    organization_id: organizationId,
    flow_key: flowKey,
    flow_pack_id: pack.id,
    overrides,
  });
});

const bodySchema = z.object({
  flow_key: z.string().min(1),
  ordinal: z.number().int().optional().nullable(),
  action: z.enum(["skip", "replace", "lock", "pin_version"]),
  flow_pack_version_id: z.string().uuid().optional().nullable(),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export const PUT = createScopedHandler("admin:flows", async (request) => {
  const organizationId = request.headers.get("x-feeldkit-organization-id");
  const actorId = request.headers.get("x-feeldkit-api-key-id");
  if (!organizationId) {
    return NextResponse.json({ error: "API key is not scoped to an organization" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_failed", details: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.action === "pin_version" && !parsed.data.flow_pack_version_id) {
    return NextResponse.json({ error: "pin_version_requires_flow_pack_version_id" }, { status: 400 });
  }
  if (parsed.data.action !== "pin_version" && (parsed.data.ordinal === undefined || parsed.data.ordinal === null)) {
    return NextResponse.json({ error: "ordinal_required_for_mapping_override" }, { status: 400 });
  }

  const flows = getFlowRepository();
  const pack = await flows.getFlowByKey(parsed.data.flow_key);
  if (!pack) {
    return NextResponse.json({ error: "flow_not_found" }, { status: 404 });
  }

  const admin = getSupabaseServiceClient();
  if (!admin) {
    return NextResponse.json({ error: "server_misconfigured" }, { status: 500 });
  }

  await writeAudit({
    organizationId,
    actorId,
    action: "flow_override.create",
    entityType: "flow_pack_overrides",
    entityId: null,
    after: parsed.data,
  });

  const { error } = await admin.from("flow_pack_overrides").insert({
    organization_id: organizationId,
    flow_pack_id: pack.id,
    flow_pack_version_id: parsed.data.flow_pack_version_id ?? null,
    ordinal: parsed.data.ordinal ?? null,
    action: parsed.data.action,
    payload: parsed.data.payload ?? {},
    created_by: actorId,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
});
