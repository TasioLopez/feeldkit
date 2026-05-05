import { NextResponse } from "next/server";
import { createScopedHandler } from "@/lib/api/endpoint";
import { writeAudit } from "@/lib/governance/audit";
import { isDomainKey } from "@/lib/governance/types";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export const DELETE = createScopedHandler("admin:policies", async (request) => {
  const organizationId = request.headers.get("x-feeldkit-organization-id");
  const actorId = request.headers.get("x-feeldkit-api-key-id");
  if (!organizationId) {
    return NextResponse.json({ error: "API key is not scoped to an organization" }, { status: 400 });
  }

  const segments = new URL(request.url).pathname.split("/").filter(Boolean);
  const domain = segments.at(-1) ?? "";
  if (!domain || !isDomainKey(domain)) {
    return NextResponse.json({ error: "invalid_domain" }, { status: 400 });
  }

  const admin = getSupabaseServiceClient();
  if (!admin) {
    return NextResponse.json({ error: "server_misconfigured" }, { status: 500 });
  }

  const { data: beforeRow } = await admin
    .from("org_policy_overrides")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("domain", domain)
    .maybeSingle();

  await writeAudit({
    organizationId,
    actorId,
    action: "policy.delete",
    entityType: "org_policy_overrides",
    entityId: null,
    before: beforeRow ?? null,
    after: null,
  });

  const { error } = await admin
    .from("org_policy_overrides")
    .delete()
    .eq("organization_id", organizationId)
    .eq("domain", domain);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
});
