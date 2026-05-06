import { NextResponse } from "next/server";
import { createScopedHandler } from "@/lib/api/endpoint";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { listPromotionProposals } from "@/lib/promotion/repository";
import type { PromotionProposalStatus, PromotionTargetTable } from "@/lib/promotion/types";

const ALL_STATUS: readonly PromotionProposalStatus[] = [
  "approved_org",
  "pending_global",
  "approved_global",
  "rejected",
  "superseded",
];

const ALL_TARGETS: readonly PromotionTargetTable[] = [
  "field_aliases",
  "field_values",
  "field_crosswalks",
];

export const GET = createScopedHandler("admin:promotions", async (request) => {
  const url = new URL(request.url);
  const organizationId = request.headers.get("x-feeldkit-organization-id");

  const statusList = url.searchParams
    .getAll("status")
    .map((s) => s.trim())
    .filter((s) => (ALL_STATUS as readonly string[]).includes(s)) as PromotionProposalStatus[];

  const target = url.searchParams.get("target_table")?.trim();
  const targetTable =
    target && (ALL_TARGETS as readonly string[]).includes(target) ? (target as PromotionTargetTable) : undefined;

  const limitRaw = Number(url.searchParams.get("limit") ?? "100");
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(1, limitRaw), 500) : 100;

  const admin = getSupabaseServiceClient();
  if (!admin) {
    return NextResponse.json({ error: "server_misconfigured" }, { status: 500 });
  }

  // Curator queue (cross-org) is allowed when no org id header is present, but
  // any caller supplying `x-feeldkit-organization-id` is scoped to that org.
  const rows = await listPromotionProposals(admin, {
    organizationId: organizationId ?? null,
    status: statusList.length > 0 ? statusList : undefined,
    targetTable,
    limit,
  });

  return NextResponse.json({
    organization_id: organizationId,
    rows,
    limit,
  });
});
