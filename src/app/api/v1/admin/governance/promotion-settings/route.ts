import { NextResponse } from "next/server";
import { z } from "zod";
import { createScopedHandler } from "@/lib/api/endpoint";
import { writeAudit } from "@/lib/governance/audit";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import {
  getOrgPromotionSettings,
  upsertOrgPromotionSettings,
} from "@/lib/promotion/repository";

const putSchema = z.object({
  default_scope: z.enum(["org", "global"]),
  opt_out_global_propose: z.boolean(),
  notes: z.string().optional(),
});

export const GET = createScopedHandler("admin:policies", async (request) => {
  const organizationId = request.headers.get("x-feeldkit-organization-id");
  if (!organizationId) {
    return NextResponse.json({ error: "API key is not scoped to an organization" }, { status: 400 });
  }
  const admin = getSupabaseServiceClient();
  if (!admin) {
    return NextResponse.json({ error: "server_misconfigured" }, { status: 500 });
  }
  const settings = await getOrgPromotionSettings(admin, organizationId);
  return NextResponse.json({ organization_id: organizationId, settings });
});

export const PUT = createScopedHandler("admin:policies", async (request) => {
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
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const admin = getSupabaseServiceClient();
  if (!admin) {
    return NextResponse.json({ error: "server_misconfigured" }, { status: 500 });
  }

  const before = await getOrgPromotionSettings(admin, organizationId);

  const result = await upsertOrgPromotionSettings(admin, {
    organizationId,
    optOutGlobalPropose: parsed.data.opt_out_global_propose,
    defaultScope: parsed.data.default_scope,
    notes: parsed.data.notes ?? null,
    actorId,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "upsert_failed" }, { status: 500 });
  }

  await writeAudit({
    organizationId,
    actorId,
    action: "promotion_settings.update",
    entityType: "org_promotion_settings",
    entityId: null,
    before,
    after: parsed.data,
  });

  return NextResponse.json({ ok: true });
});
