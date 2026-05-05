import { NextResponse } from "next/server";
import { createScopedHandler } from "@/lib/api/endpoint";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

const MAX_LIMIT = 200;

export const GET = createScopedHandler("admin:reviews", async (request) => {
  const organizationId = request.headers.get("x-feeldkit-organization-id");
  if (!organizationId) {
    return NextResponse.json({ error: "API key is not scoped to an organization" }, { status: 400 });
  }

  const url = new URL(request.url);
  const entityType = url.searchParams.get("entity_type")?.trim();
  const action = url.searchParams.get("action")?.trim();
  const since = url.searchParams.get("since")?.trim();
  const limitRaw = Number(url.searchParams.get("limit") ?? "50");
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(1, limitRaw), MAX_LIMIT) : 50;

  const admin = getSupabaseServiceClient();
  if (!admin) {
    return NextResponse.json({ error: "server_misconfigured" }, { status: 500 });
  }

  let q = admin
    .from("audit_logs")
    .select("id, organization_id, actor_id, action, entity_type, entity_id, before, after, created_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (entityType) {
    q = q.eq("entity_type", entityType);
  }
  if (action) {
    q = q.eq("action", action);
  }
  if (since) {
    q = q.gte("created_at", since);
  }

  const { data, error } = await q;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    organization_id: organizationId,
    rows: data ?? [],
    limit,
  });
});
