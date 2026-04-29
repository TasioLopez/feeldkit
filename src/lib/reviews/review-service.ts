import { getSupabaseServiceClient } from "@/lib/supabase/server";

export type ReviewStatus = "pending" | "approved" | "rejected";

export type ReviewRecord = {
  id: string;
  organizationId: string;
  fieldTypeId: string;
  fieldKey: string;
  input: string;
  normalizedInput: string;
  confidence: number;
  status: ReviewStatus;
  suggestedValueId: string | null;
  selectedValueId: string | null;
  reviewedAt: string | null;
  notes: string | null;
  createdAt: string;
};

type QueueParams = {
  organizationId: string;
  fieldTypeId: string;
  input: string;
  normalizedInput: string;
  confidence: number;
  suggestedValueId?: string | null;
};

export async function queueReviewRecord(params: QueueParams): Promise<ReviewRecord | null> {
  const admin = getSupabaseServiceClient();
  if (!admin) {
    return null;
  }

  const { data, error } = await admin
    .from("mapping_reviews")
    .insert({
      organization_id: params.organizationId,
      field_type_id: params.fieldTypeId,
      input: params.input,
      normalized_input: params.normalizedInput,
      suggested_value_id: params.suggestedValueId ?? null,
      status: "pending",
    })
    .select("id, organization_id, field_type_id, input, normalized_input, status, suggested_value_id, selected_value_id, reviewed_at, notes, created_at")
    .single();

  if (error || !data) {
    return null;
  }

  const { data: fieldType } = await admin.from("field_types").select("key").eq("id", data.field_type_id).maybeSingle();

  return {
    id: data.id as string,
    organizationId: data.organization_id as string,
    fieldTypeId: data.field_type_id as string,
    fieldKey: (fieldType?.key as string) ?? "unknown",
    input: data.input as string,
    normalizedInput: data.normalized_input as string,
    confidence: params.confidence,
    status: (data.status as ReviewStatus) ?? "pending",
    suggestedValueId: (data.suggested_value_id as string | null) ?? null,
    selectedValueId: (data.selected_value_id as string | null) ?? null,
    reviewedAt: (data.reviewed_at as string | null) ?? null,
    notes: (data.notes as string | null) ?? null,
    createdAt: data.created_at as string,
  };
}

export async function listReviewRecords(organizationId: string, limit = 200): Promise<ReviewRecord[]> {
  const admin = getSupabaseServiceClient();
  if (!admin) {
    return [];
  }

  const { data, error } = await admin
    .from("mapping_reviews")
    .select("id, organization_id, field_type_id, input, normalized_input, status, suggested_value_id, selected_value_id, reviewed_at, notes, created_at, field_types(key)")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) {
    return [];
  }

  return data.map((row) => {
    const fieldType = (row.field_types as { key?: string } | null) ?? null;
    return {
      id: row.id as string,
      organizationId: row.organization_id as string,
      fieldTypeId: row.field_type_id as string,
      fieldKey: fieldType?.key ?? "unknown",
      input: row.input as string,
      normalizedInput: row.normalized_input as string,
      confidence: 0,
      status: (row.status as ReviewStatus) ?? "pending",
      suggestedValueId: (row.suggested_value_id as string | null) ?? null,
      selectedValueId: (row.selected_value_id as string | null) ?? null,
      reviewedAt: (row.reviewed_at as string | null) ?? null,
      notes: (row.notes as string | null) ?? null,
      createdAt: row.created_at as string,
    };
  });
}

export async function setReviewDecision(
  args: {
    reviewId: string;
    organizationId: string;
    actorId: string;
    decision: "approved" | "rejected";
    selectedValueId?: string | null;
    notes?: string | null;
  },
): Promise<{ ok: boolean; error?: string }> {
  const admin = getSupabaseServiceClient();
  if (!admin) {
    return { ok: false, error: "Server configuration error." };
  }
  const status = args.decision === "approved" ? "approved" : "rejected";
  const { error } = await admin
    .from("mapping_reviews")
    .update({
      status,
      selected_value_id: args.selectedValueId ?? null,
      reviewed_by: args.actorId,
      reviewed_at: new Date().toISOString(),
      notes: args.notes ?? null,
    })
    .eq("id", args.reviewId)
    .eq("organization_id", args.organizationId);
  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
