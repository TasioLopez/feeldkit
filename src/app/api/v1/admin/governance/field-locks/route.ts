import { NextResponse } from "next/server";
import { z } from "zod";
import { createScopedHandler } from "@/lib/api/endpoint";
import { writeAudit } from "@/lib/governance/audit";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  field_key: z.string().min(1),
  mode: z.enum(["require_review", "disable_auto_apply"]),
  reason: z.string().optional(),
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

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const admin = getSupabaseServiceClient();
  if (!admin) {
    return NextResponse.json({ error: "server_misconfigured" }, { status: 500 });
  }

  const { data: beforeRow } = await admin
    .from("org_field_locks")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("field_key", parsed.data.field_key)
    .maybeSingle();

  await writeAudit({
    organizationId,
    actorId,
    action: "field_lock.update",
    entityType: "org_field_locks",
    entityId: null,
    before: beforeRow ?? null,
    after: parsed.data,
  });

  const { error } = await admin.from("org_field_locks").upsert(
    {
      organization_id: organizationId,
      field_key: parsed.data.field_key,
      mode: parsed.data.mode,
      reason: parsed.data.reason ?? null,
      created_by: actorId,
    },
    { onConflict: "organization_id,field_key" },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
});
