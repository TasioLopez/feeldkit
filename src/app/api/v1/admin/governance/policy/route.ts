import { NextResponse } from "next/server";
import { z } from "zod";
import { createScopedHandler } from "@/lib/api/endpoint";
import { DOMAIN_POLICIES } from "@/lib/matching/inference/policy";
import { writeAudit } from "@/lib/governance/audit";
import { getGovernanceRepository } from "@/lib/governance/get-governance-repository";
import { isDomainKey } from "@/lib/governance/types";
import { orgPolicyOverrideRowConsistent } from "@/lib/governance/policy-override-check";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

const policyPutSchema = z.object({
  domain: z.string(),
  matched: z.number(),
  suggested: z.number(),
  notes: z.string().optional(),
});

export const GET = createScopedHandler("admin:policies", async (request) => {
  const organizationId = request.headers.get("x-feeldkit-organization-id");
  if (!organizationId) {
    return NextResponse.json({ error: "API key is not scoped to an organization" }, { status: 400 });
  }

  const governance = getGovernanceRepository();
  const [orgOverrides, fieldLocks] = await Promise.all([
    governance.listOrgPolicyOverrides(organizationId),
    governance.listOrgFieldLocks(organizationId),
  ]);

  return NextResponse.json({
    organization_id: organizationId,
    defaults: DOMAIN_POLICIES,
    org_overrides: orgOverrides,
    field_locks: fieldLocks,
  });
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

  const parsed = policyPutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_failed", details: parsed.error.flatten() }, { status: 400 });
  }

  if (!isDomainKey(parsed.data.domain)) {
    return NextResponse.json({ error: "invalid_domain" }, { status: 400 });
  }
  if (!orgPolicyOverrideRowConsistent(parsed.data.matched, parsed.data.suggested)) {
    return NextResponse.json({ error: "invalid_thresholds", hint: "require matched > suggested within [0,1]" }, { status: 400 });
  }

  const admin = getSupabaseServiceClient();
  if (!admin) {
    return NextResponse.json({ error: "server_misconfigured" }, { status: 500 });
  }

  const { data: beforeRow } = await admin
    .from("org_policy_overrides")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("domain", parsed.data.domain)
    .maybeSingle();

  await writeAudit({
    organizationId,
    actorId,
    action: "policy.update",
    entityType: "org_policy_overrides",
    entityId: null,
    before: beforeRow ?? null,
    after: parsed.data,
  });

  const { error } = await admin.from("org_policy_overrides").upsert(
    {
      organization_id: organizationId,
      domain: parsed.data.domain,
      matched: parsed.data.matched,
      suggested: parsed.data.suggested,
      notes: parsed.data.notes ?? null,
      updated_at: new Date().toISOString(),
      updated_by: actorId,
    },
    { onConflict: "organization_id,domain" },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
});
