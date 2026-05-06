/**
 * Aggregate Phase 5 promotion metrics from `promotion_proposals`,
 * `promoted_decisions`, `mapping_reviews`, and `audit_logs` and emit a
 * machine-readable report.
 *
 * Usage:
 *   npm run promotion:metrics
 *
 * The script writes `.generated/promotion-metrics-report.json`. The dashboard
 * (Wave 3) and `verify:pack-health` consume the same file.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

type StatusBreakdown = {
  approved_org: number;
  approved_global: number;
  pending_global: number;
  rejected: number;
  superseded: number;
};

type SourceBreakdown = {
  review: number;
  enrichment_proposal: number;
};

type Report = {
  generated_at: string;
  proposals_total: number;
  proposals_by_status: StatusBreakdown;
  proposals_by_source: SourceBreakdown;
  reverts_total: number;
  revert_rate_30d: number;
  repeated_review_inputs_30d: number;
  auto_apply_lift_30d: {
    approved_inputs: number;
    re_observed_inputs: number;
  };
  per_org: Array<{
    organization_id: string;
    proposals_total: number;
    pending_global: number;
    approved_org: number;
    approved_global: number;
    reverts_total: number;
  }>;
};

const STATUS_ZERO: StatusBreakdown = {
  approved_org: 0,
  approved_global: 0,
  pending_global: 0,
  rejected: 0,
  superseded: 0,
};

const SOURCE_ZERO: SourceBreakdown = {
  review: 0,
  enrichment_proposal: 0,
};

async function run() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }
  const admin = createClient(url, key, { auth: { persistSession: false } });

  const since30d = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();

  const { data: proposals, error: proposalsErr } = await admin
    .from("promotion_proposals")
    .select("id, status, source_kind, organization_id, created_at");
  if (proposalsErr) {
    console.error(`[FAIL] proposals: ${proposalsErr.message}`);
    process.exit(1);
  }
  const proposalsRows = proposals ?? [];

  const proposalsByStatus: StatusBreakdown = { ...STATUS_ZERO };
  const proposalsBySource: SourceBreakdown = { ...SOURCE_ZERO };
  const perOrg = new Map<
    string,
    { proposals_total: number; pending_global: number; approved_org: number; approved_global: number; reverts_total: number }
  >();

  for (const row of proposalsRows) {
    const status = row.status as keyof StatusBreakdown;
    if (status in proposalsByStatus) proposalsByStatus[status] += 1;
    const source = row.source_kind as keyof SourceBreakdown;
    if (source in proposalsBySource) proposalsBySource[source] += 1;
    const orgId = row.organization_id as string;
    if (!perOrg.has(orgId)) {
      perOrg.set(orgId, { proposals_total: 0, pending_global: 0, approved_org: 0, approved_global: 0, reverts_total: 0 });
    }
    const bucket = perOrg.get(orgId)!;
    bucket.proposals_total += 1;
    if (status === "pending_global") bucket.pending_global += 1;
    if (status === "approved_org") bucket.approved_org += 1;
    if (status === "approved_global") bucket.approved_global += 1;
  }

  const { data: promoted } = await admin
    .from("promoted_decisions")
    .select("id, organization_id, reverted_at, created_at")
    .order("created_at", { ascending: false })
    .limit(5000);

  let revertsTotal = 0;
  let promoted30d = 0;
  let reverts30d = 0;
  for (const row of promoted ?? []) {
    if (row.reverted_at) revertsTotal += 1;
    const created = String(row.created_at);
    if (created >= since30d) {
      promoted30d += 1;
      if (row.reverted_at) reverts30d += 1;
    }
    const orgId = row.organization_id as string | null;
    if (orgId && perOrg.has(orgId) && row.reverted_at) {
      perOrg.get(orgId)!.reverts_total += 1;
    }
  }

  const { data: reviewInputs } = await admin
    .from("mapping_reviews")
    .select("organization_id, field_type_id, normalized_input, created_at")
    .gte("created_at", since30d)
    .limit(5000);
  const inputCounts = new Map<string, number>();
  for (const row of reviewInputs ?? []) {
    const k = `${row.organization_id}|${row.field_type_id}|${row.normalized_input}`;
    inputCounts.set(k, (inputCounts.get(k) ?? 0) + 1);
  }
  let repeatedReviewInputs = 0;
  for (const v of inputCounts.values()) if (v > 1) repeatedReviewInputs += v;

  const { data: approvedReviews } = await admin
    .from("mapping_reviews")
    .select("organization_id, field_type_id, normalized_input, status, reviewed_at")
    .eq("status", "approved")
    .gte("reviewed_at", since30d)
    .limit(5000);
  const approvedKeys = new Set<string>();
  for (const row of approvedReviews ?? []) {
    approvedKeys.add(`${row.organization_id}|${row.field_type_id}|${row.normalized_input}`);
  }
  let reObservedInputs = 0;
  for (const row of reviewInputs ?? []) {
    const k = `${row.organization_id}|${row.field_type_id}|${row.normalized_input}`;
    if (approvedKeys.has(k)) reObservedInputs += 1;
  }

  const report: Report = {
    generated_at: new Date().toISOString(),
    proposals_total: proposalsRows.length,
    proposals_by_status: proposalsByStatus,
    proposals_by_source: proposalsBySource,
    reverts_total: revertsTotal,
    revert_rate_30d: promoted30d === 0 ? 0 : reverts30d / promoted30d,
    repeated_review_inputs_30d: repeatedReviewInputs,
    auto_apply_lift_30d: {
      approved_inputs: approvedKeys.size,
      re_observed_inputs: reObservedInputs,
    },
    per_org: [...perOrg.entries()].map(([organization_id, bucket]) => ({ organization_id, ...bucket })),
  };

  const outDir = resolve(process.cwd(), ".generated");
  await mkdir(outDir, { recursive: true });
  const out = resolve(outDir, "promotion-metrics-report.json");
  await writeFile(out, JSON.stringify(report, null, 2), "utf8");
  console.log(`[OK] proposals_total=${report.proposals_total} reverts_total=${report.reverts_total}`);
  console.log(`[INFO] report written to ${out}`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
