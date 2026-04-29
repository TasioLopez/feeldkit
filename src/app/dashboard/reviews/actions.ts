"use server";

import { revalidatePath } from "next/cache";
import { assertAdminRole, getAdminActorContext } from "@/lib/auth/admin-context";
import { setReviewDecision } from "@/lib/reviews/review-service";
import { decideEnrichmentProposal } from "@/lib/enrichment/proposal-service";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { normalizeText } from "@/lib/matching/normalize-text";

export async function approveReviewAction(reviewId: string, selectedValueId?: string | null): Promise<void> {
  const actor = await getAdminActorContext();
  if (!actor) return;
  try {
    assertAdminRole(actor.role, "review mappings");
  } catch {
    return;
  }
  const admin = getSupabaseServiceClient();
  if (!admin) {
    return;
  }
  const { data: row } = await admin
    .from("mapping_reviews")
    .select("id, field_type_id, input, suggested_value_id")
    .eq("id", reviewId)
    .eq("organization_id", actor.organizationId)
    .maybeSingle();
  if (!row) {
    return;
  }
  const resolvedValueId = selectedValueId ?? (row.suggested_value_id as string | null);
  if (!resolvedValueId) {
    return;
  }
  const decision = await setReviewDecision({
    reviewId,
    organizationId: actor.organizationId,
    actorId: actor.userId,
    decision: "approved",
    selectedValueId: resolvedValueId,
  });
  if (!decision.ok) {
    return;
  }

  await admin.from("field_aliases").upsert(
    {
      field_value_id: resolvedValueId,
      field_type_id: row.field_type_id,
      alias: row.input,
      normalized_alias: normalizeText(row.input as string),
      locale: null,
      source: "review_approval",
      confidence: 0.95,
      status: "active",
    },
    { onConflict: "field_type_id,normalized_alias" },
  );
  revalidatePath("/dashboard/reviews");
}

export async function rejectReviewAction(reviewId: string): Promise<void> {
  const actor = await getAdminActorContext();
  if (!actor) return;
  try {
    assertAdminRole(actor.role, "review mappings");
  } catch {
    return;
  }
  const decision = await setReviewDecision({
    reviewId,
    organizationId: actor.organizationId,
    actorId: actor.userId,
    decision: "rejected",
  });
  if (!decision.ok) {
    return;
  }
  revalidatePath("/dashboard/reviews");
}

export async function decideEnrichmentProposalAction(proposalId: string, decision: "approved" | "rejected"): Promise<void> {
  const actor = await getAdminActorContext();
  if (!actor) return;
  try {
    assertAdminRole(actor.role, "review enrichment proposals");
  } catch {
    return;
  }

  const result = await decideEnrichmentProposal({
    proposalId,
    organizationId: actor.organizationId,
    actorId: actor.userId,
    decision,
  });
  if (!result.ok) {
    return;
  }
  revalidatePath("/dashboard/reviews");
  revalidatePath("/dashboard/packs");
}

export async function decideEnrichmentProposalWithEditsAction(formData: FormData): Promise<void> {
  const actor = await getAdminActorContext();
  if (!actor) return;
  try {
    assertAdminRole(actor.role, "review enrichment proposals");
  } catch {
    return;
  }
  const proposalId = String(formData.get("proposal_id") ?? "");
  const decision = String(formData.get("decision") ?? "") as "approved" | "rejected";
  const overrideKey = String(formData.get("override_key") ?? "").trim();
  const overrideLabel = String(formData.get("override_label") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  if (!proposalId || !["approved", "rejected"].includes(decision)) return;

  const result = await decideEnrichmentProposal({
    proposalId,
    organizationId: actor.organizationId,
    actorId: actor.userId,
    decision,
    overrideKey: overrideKey || undefined,
    overrideLabel: overrideLabel || undefined,
    notes: notes || undefined,
  });
  if (!result.ok) return;
  revalidatePath("/dashboard/reviews");
  revalidatePath("/dashboard/packs");
}

export async function bulkRejectPendingProposalsAction(formData: FormData): Promise<void> {
  const actor = await getAdminActorContext();
  if (!actor) return;
  try {
    assertAdminRole(actor.role, "review enrichment proposals");
  } catch {
    return;
  }
  const ids = String(formData.get("proposal_ids") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, 200);
  for (const id of ids) {
    await decideEnrichmentProposal({
      proposalId: id,
      organizationId: actor.organizationId,
      actorId: actor.userId,
      decision: "rejected",
      notes: "Bulk rejected",
    });
  }
  revalidatePath("/dashboard/reviews");
}

export async function bulkApprovePendingProposalsAction(formData: FormData): Promise<void> {
  const actor = await getAdminActorContext();
  if (!actor) return;
  try {
    assertAdminRole(actor.role, "review enrichment proposals");
  } catch {
    return;
  }
  const ids = String(formData.get("proposal_ids") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, 200);
  for (const id of ids) {
    await decideEnrichmentProposal({
      proposalId: id,
      organizationId: actor.organizationId,
      actorId: actor.userId,
      decision: "approved",
      notes: "Bulk approved",
    });
  }
  revalidatePath("/dashboard/reviews");
  revalidatePath("/dashboard/packs");
}
