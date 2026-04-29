import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { normalizeText } from "@/lib/matching/normalize-text";

export type EnrichmentProposal = {
  id: string;
  organizationId: string;
  fieldTypeId: string;
  sourceInput: string;
  normalizedInput: string;
  suggestedKey: string;
  suggestedLabel: string;
  confidence: number;
  reasoning: string | null;
  provider: string | null;
  model: string | null;
  status: "pending" | "approved" | "rejected";
  payload: Record<string, unknown>;
  createdAt: string;
};

export async function createEnrichmentProposals(params: {
  organizationId: string;
  fieldTypeId: string;
  sourceInput: string;
  provider: string;
  model: string;
  actorId?: string | null;
  suggestions: Array<{ key: string; label: string; confidence: number; reasoning: string }>;
}): Promise<EnrichmentProposal[]> {
  const admin = getSupabaseServiceClient();
  if (!admin || params.suggestions.length === 0) {
    return [];
  }
  const confidenceFloor = Number(process.env.FEELDKIT_AI_MIN_CONFIDENCE ?? 0.4);
  const maxPerRun = Math.min(Math.max(Number(process.env.FEELDKIT_AI_MAX_PROPOSALS_PER_RUN ?? 25), 1), 200);
  const normalizedInput = normalizeText(params.sourceInput);
  const deduped = new Map<string, (typeof params.suggestions)[number]>();
  for (const item of params.suggestions) {
    const labelKey = normalizeText(item.label);
    if (!labelKey) continue;
    if (!deduped.has(labelKey)) {
      deduped.set(labelKey, item);
    }
  }

  const filtered = [...deduped.values()]
    .filter((item) => item.confidence >= confidenceFloor)
    .slice(0, maxPerRun);
  if (filtered.length === 0) {
    return [];
  }

  const { data: existingValues } = await admin
    .from("field_values")
    .select("label,key")
    .eq("field_type_id", params.fieldTypeId)
    .limit(2000);
  const existingKeys = new Set((existingValues ?? []).map((entry) => String(entry.key)));
  const existingLabels = new Set((existingValues ?? []).map((entry) => normalizeText(String(entry.label))));

  const rows = filtered
    .filter((item) => !existingKeys.has(item.key) && !existingLabels.has(normalizeText(item.label)))
    .map((item) => ({
    organization_id: params.organizationId,
    field_type_id: params.fieldTypeId,
    source_input: params.sourceInput,
    normalized_input: normalizedInput,
    suggested_key: item.key,
    suggested_label: item.label,
    confidence: item.confidence,
    reasoning: item.reasoning,
    provider: params.provider,
    model: params.model,
    status: "pending",
    payload: {
      source: "ai-enricher",
      suggestion: item,
    },
    created_by: params.actorId ?? null,
  }));
  if (rows.length === 0) {
    return [];
  }

  const { data, error } = await admin
    .from("enrichment_proposals")
    .insert(rows)
    .select(
      "id, organization_id, field_type_id, source_input, normalized_input, suggested_key, suggested_label, confidence, reasoning, provider, model, status, payload, created_at",
    );
  if (error || !data) {
    return [];
  }
  return data.map((row) => ({
    id: row.id as string,
    organizationId: row.organization_id as string,
    fieldTypeId: row.field_type_id as string,
    sourceInput: row.source_input as string,
    normalizedInput: row.normalized_input as string,
    suggestedKey: row.suggested_key as string,
    suggestedLabel: row.suggested_label as string,
    confidence: Number(row.confidence ?? 0),
    reasoning: (row.reasoning as string | null) ?? null,
    provider: (row.provider as string | null) ?? null,
    model: (row.model as string | null) ?? null,
    status: (row.status as EnrichmentProposal["status"]) ?? "pending",
    payload: (row.payload as Record<string, unknown>) ?? {},
    createdAt: row.created_at as string,
  }));
}

export async function listPendingEnrichmentProposals(organizationId: string, limit = 200): Promise<EnrichmentProposal[]> {
  const admin = getSupabaseServiceClient();
  if (!admin) return [];
  const { data, error } = await admin
    .from("enrichment_proposals")
    .select(
      "id, organization_id, field_type_id, source_input, normalized_input, suggested_key, suggested_label, confidence, reasoning, provider, model, status, payload, created_at",
    )
    .eq("organization_id", organizationId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id as string,
    organizationId: row.organization_id as string,
    fieldTypeId: row.field_type_id as string,
    sourceInput: row.source_input as string,
    normalizedInput: row.normalized_input as string,
    suggestedKey: row.suggested_key as string,
    suggestedLabel: row.suggested_label as string,
    confidence: Number(row.confidence ?? 0),
    reasoning: (row.reasoning as string | null) ?? null,
    provider: (row.provider as string | null) ?? null,
    model: (row.model as string | null) ?? null,
    status: (row.status as EnrichmentProposal["status"]) ?? "pending",
    payload: (row.payload as Record<string, unknown>) ?? {},
    createdAt: row.created_at as string,
  }));
}

export async function decideEnrichmentProposal(args: {
  proposalId: string;
  organizationId: string;
  actorId: string;
  decision: "approved" | "rejected";
  notes?: string;
  overrideKey?: string;
  overrideLabel?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const admin = getSupabaseServiceClient();
  if (!admin) {
    return { ok: false, error: "Server configuration error." };
  }

  const { data: proposal, error: fetchError } = await admin
    .from("enrichment_proposals")
    .select("id, field_type_id, source_input, suggested_key, suggested_label")
    .eq("id", args.proposalId)
    .eq("organization_id", args.organizationId)
    .maybeSingle();
  if (fetchError || !proposal) {
    return { ok: false, error: fetchError?.message ?? "Proposal not found." };
  }

  if (args.decision === "approved") {
    const approvedKey = (args.overrideKey ?? proposal.suggested_key).trim();
    const approvedLabel = (args.overrideLabel ?? proposal.suggested_label).trim();
    if (!approvedKey || !approvedLabel) {
      return { ok: false, error: "Approved key/label cannot be empty." };
    }
    const { data: valueRow, error: valueErr } = await admin
      .from("field_values")
      .upsert(
        {
          field_type_id: proposal.field_type_id,
          key: approvedKey,
          label: approvedLabel,
          normalized_label: normalizeText(approvedLabel),
          locale: null,
          description: null,
          parent_id: null,
          sort_order: 0,
          status: "active",
          metadata: { source: "ai_proposal", proposal_id: args.proposalId },
          source: "ai_proposal",
          source_id: args.proposalId,
        },
        { onConflict: "field_type_id,key" },
      )
      .select("id")
      .single();
    if (valueErr || !valueRow) {
      return { ok: false, error: valueErr?.message ?? "Unable to create canonical value." };
    }

    await admin.from("field_aliases").upsert(
      {
        field_value_id: valueRow.id,
        field_type_id: proposal.field_type_id,
        alias: proposal.source_input,
        normalized_alias: normalizeText(proposal.source_input),
        locale: null,
        source: "ai_proposal",
        confidence: 0.9,
        status: "active",
      },
      { onConflict: "field_type_id,normalized_alias" },
    );
  }

  const { error: updateErr } = await admin
    .from("enrichment_proposals")
    .update({
      status: args.decision,
      reviewed_by: args.actorId,
      reviewed_at: new Date().toISOString(),
      payload: {
        decision_notes: args.notes ?? null,
        approved_key: args.overrideKey ?? null,
        approved_label: args.overrideLabel ?? null,
      },
    })
    .eq("id", args.proposalId)
    .eq("organization_id", args.organizationId);
  if (updateErr) {
    return { ok: false, error: updateErr.message };
  }

  return { ok: true };
}
