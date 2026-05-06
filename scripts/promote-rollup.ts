/**
 * Promotion registry rollup (Phase 5 Wave 3).
 *
 * Aggregates `promoted_decisions` rows that have not yet been linked to a
 * `promoted_intelligence_versions` row, bumps semver according to
 * `deriveBumpKind`, and writes one parent version + per-target child entries.
 *
 * Usage:
 *   npm run promote:rollup
 *
 * Honours `PROMOTE_ROLLUP_DRY_RUN=1` to print what would happen without
 * mutating the database.
 */
import { createClient } from "@supabase/supabase-js";
import {
  bumpSemver,
  compareSemver,
  deriveBumpKind,
  formatSemver,
  parseSemver,
  ZERO_VERSION,
  type Semver,
} from "../src/lib/promotion/semver";

type DecisionRow = {
  id: string;
  source_kind: string;
  source_id: string;
  organization_id: string | null;
  target_table: string;
  target_id: string;
  reverted_at: string | null;
  audit_log_id: string | null;
  created_at: string;
};

async function run() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }
  const dryRun = process.env.PROMOTE_ROLLUP_DRY_RUN === "1";
  const admin = createClient(url, key, { auth: { persistSession: false } });

  const { data: latestVersion } = await admin
    .from("promoted_intelligence_versions")
    .select("id, version, generated_at")
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let baseSemver: Semver = ZERO_VERSION;
  let baseGeneratedAt: string | null = null;
  if (latestVersion?.version) {
    const parsed = parseSemver(String(latestVersion.version));
    if (!parsed) {
      console.error(`Invalid existing version on registry: ${latestVersion.version}`);
      process.exit(1);
    }
    baseSemver = parsed;
    baseGeneratedAt = String(latestVersion.generated_at);
  }

  const { data: linkedRows } = await admin
    .from("promoted_intelligence_entries")
    .select("promoted_decision_id, target_table");
  const knownTargetTables = new Set<string>();
  const claimedDecisionIds = new Set<string>();
  for (const entry of linkedRows ?? []) {
    knownTargetTables.add(String(entry.target_table));
    if (entry.promoted_decision_id) {
      claimedDecisionIds.add(String(entry.promoted_decision_id));
    }
  }

  let q = admin
    .from("promoted_decisions")
    .select("id, source_kind, source_id, organization_id, target_table, target_id, reverted_at, audit_log_id, created_at")
    .order("created_at", { ascending: true })
    .limit(2000);
  if (baseGeneratedAt) {
    q = q.gt("created_at", baseGeneratedAt);
  }
  const { data: decisionRows, error: decisionsErr } = await q;
  if (decisionsErr) {
    console.error(`Failed to load promoted_decisions: ${decisionsErr.message}`);
    process.exit(1);
  }

  const decisions = (decisionRows ?? []) as DecisionRow[];
  const fresh = decisions.filter((row) => !claimedDecisionIds.has(row.id));
  if (fresh.length === 0) {
    console.log("[OK] no new promoted decisions since last version; nothing to roll up.");
    return;
  }

  const newTargetTables = new Set<string>(fresh.map((row) => row.target_table));
  const hasReverts = fresh.some((row) => row.reverted_at !== null);

  const bumpKind = deriveBumpKind({
    hasReverts,
    newTargetTables,
    knownTargetTables,
  });
  const next = bumpSemver(baseSemver, bumpKind);
  if (compareSemver(next, baseSemver) <= 0) {
    console.error(`Bump produced non-monotonic version: base=${formatSemver(baseSemver)} next=${formatSemver(next)}`);
    process.exit(1);
  }

  const stats = {
    decisions_total: fresh.length,
    by_target_table: countBy(fresh, (row) => row.target_table),
    by_source_kind: countBy(fresh, (row) => row.source_kind),
    reverts: fresh.filter((row) => row.reverted_at !== null).length,
    organizations_touched: new Set(fresh.map((row) => row.organization_id ?? "_global")).size,
    base_version: formatSemver(baseSemver),
    bump_kind: bumpKind,
  };

  const changelog = {
    summary: `+${stats.decisions_total} decisions across ${Object.keys(stats.by_target_table).length} target table(s); bump=${bumpKind}`,
    by_target_table: stats.by_target_table,
    by_source_kind: stats.by_source_kind,
    reverts: stats.reverts,
  };

  console.log(`[INFO] base=${formatSemver(baseSemver)} → next=${formatSemver(next)} (bump=${bumpKind})`);
  console.log(`[INFO] decisions_total=${stats.decisions_total} reverts=${stats.reverts}`);

  if (dryRun) {
    console.log("[DRY-RUN] not writing rollup");
    console.log(JSON.stringify({ next: formatSemver(next), stats, changelog }, null, 2));
    return;
  }

  const { data: versionRow, error: versionErr } = await admin
    .from("promoted_intelligence_versions")
    .insert({
      version: formatSemver(next),
      changelog,
      stats,
    })
    .select("id")
    .single();
  if (versionErr || !versionRow?.id) {
    console.error(`[FAIL] insert version: ${versionErr?.message ?? "unknown"}`);
    process.exit(1);
  }

  const entries = fresh.map((row) => ({
    version_id: versionRow.id as string,
    promoted_decision_id: row.id,
    target_table: row.target_table,
    target_id: row.target_id,
    action: row.reverted_at ? "reverted" : "added",
    payload: {
      source_kind: row.source_kind,
      source_id: row.source_id,
      organization_id: row.organization_id,
      audit_log_id: row.audit_log_id,
    },
  }));
  for (let i = 0; i < entries.length; i += 100) {
    const slice = entries.slice(i, i + 100);
    const { error: insertErr } = await admin.from("promoted_intelligence_entries").insert(slice);
    if (insertErr) {
      console.error(`[FAIL] insert entries (slice ${i}): ${insertErr.message}`);
      process.exit(1);
    }
  }

  console.log(`[OK] wrote version ${formatSemver(next)} with ${entries.length} entries.`);
}

function countBy<T>(rows: T[], key: (row: T) => string): Record<string, number> {
  const acc: Record<string, number> = {};
  for (const row of rows) {
    const k = key(row);
    acc[k] = (acc[k] ?? 0) + 1;
  }
  return acc;
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
