import type { SupabaseClient } from "@supabase/supabase-js";

export type ReviewPromotionImpact = {
  proposalStatuses: string[];
  inRegistry: boolean;
};

/**
 * For dashboard "impact" tiles: load `promotion_proposals` tied to mapping
 * reviews and detect whether any rollup entry references a promoted_decision
 * for that review.
 */
export async function fetchReviewPromotionImpacts(
  admin: SupabaseClient,
  organizationId: string,
  reviewIds: string[],
): Promise<Map<string, ReviewPromotionImpact>> {
  const map = new Map<string, ReviewPromotionImpact>();
  if (reviewIds.length === 0) return map;

  for (const id of reviewIds) {
    map.set(id, { proposalStatuses: [], inRegistry: false });
  }

  const { data: proposals } = await admin
    .from("promotion_proposals")
    .select("source_id, status")
    .eq("source_kind", "review")
    .eq("organization_id", organizationId)
    .in("source_id", reviewIds);

  for (const row of proposals ?? []) {
    const sid = row.source_id as string;
    const bucket = map.get(sid);
    if (bucket) bucket.proposalStatuses.push(String(row.status));
  }

  const { data: decisions } = await admin
    .from("promoted_decisions")
    .select("id, source_id")
    .eq("source_kind", "review")
    .eq("organization_id", organizationId)
    .in("source_id", reviewIds);

  const decisionIds = (decisions ?? []).map((d) => d.id as string);
  const reviewByDecision = new Map<string, string>();
  for (const d of decisions ?? []) {
    reviewByDecision.set(d.id as string, d.source_id as string);
  }

  if (decisionIds.length > 0) {
    const { data: entries } = await admin
      .from("promoted_intelligence_entries")
      .select("promoted_decision_id")
      .in("promoted_decision_id", decisionIds);
    for (const e of entries ?? []) {
      const pid = e.promoted_decision_id as string | null;
      if (!pid) continue;
      const reviewId = reviewByDecision.get(pid);
      if (!reviewId) continue;
      const bucket = map.get(reviewId);
      if (bucket) bucket.inRegistry = true;
    }
  }

  return map;
}
