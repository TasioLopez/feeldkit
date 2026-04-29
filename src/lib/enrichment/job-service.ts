import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { getFieldRepository } from "@/lib/repositories/get-field-repository";
import { suggestPackEnrichments } from "@/lib/ai/pack-enricher";
import { createEnrichmentProposals } from "@/lib/enrichment/proposal-service";

export type EnrichmentJob = {
  id: string;
  organizationId: string;
  fieldKey: string;
  limit: number;
  status: "pending" | "running" | "completed" | "failed";
  submittedCount: number;
  createdCount: number;
  skippedCount: number;
  error: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function createEnrichmentJob(args: {
  organizationId: string;
  requestedBy: string;
  fieldKey: string;
  limit: number;
  inputs: string[];
}): Promise<EnrichmentJob | null> {
  const admin = getSupabaseServiceClient();
  if (!admin) return null;
  const submittedCount = args.inputs.length;
  const { data, error } = await admin
    .from("enrichment_jobs")
    .insert({
      organization_id: args.organizationId,
      requested_by: args.requestedBy,
      field_key: args.fieldKey,
      suggestion_limit: args.limit,
      status: "pending",
      payload: { inputs: args.inputs },
      submitted_count: submittedCount,
      created_count: 0,
      skipped_count: 0,
    })
    .select("id, organization_id, field_key, suggestion_limit, status, submitted_count, created_count, skipped_count, error_message, created_at, updated_at")
    .single();
  if (error || !data) return null;
  return {
    id: data.id as string,
    organizationId: data.organization_id as string,
    fieldKey: data.field_key as string,
    limit: Number(data.suggestion_limit ?? args.limit),
    status: (data.status as EnrichmentJob["status"]) ?? "pending",
    submittedCount: Number(data.submitted_count ?? submittedCount),
    createdCount: Number(data.created_count ?? 0),
    skippedCount: Number(data.skipped_count ?? 0),
    error: (data.error_message as string | null) ?? null,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}

export async function listEnrichmentJobs(organizationId: string, limit = 30): Promise<EnrichmentJob[]> {
  const admin = getSupabaseServiceClient();
  if (!admin) return [];
  const { data, error } = await admin
    .from("enrichment_jobs")
    .select("id, organization_id, field_key, suggestion_limit, status, submitted_count, created_count, skipped_count, error_message, created_at, updated_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id as string,
    organizationId: row.organization_id as string,
    fieldKey: row.field_key as string,
    limit: Number(row.suggestion_limit ?? 5),
    status: (row.status as EnrichmentJob["status"]) ?? "pending",
    submittedCount: Number(row.submitted_count ?? 0),
    createdCount: Number(row.created_count ?? 0),
    skippedCount: Number(row.skipped_count ?? 0),
    error: (row.error_message as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }));
}

export async function processPendingEnrichmentJobs(organizationId: string, maxJobs = 3): Promise<number> {
  const admin = getSupabaseServiceClient();
  if (!admin) return 0;
  const { data: jobs } = await admin
    .from("enrichment_jobs")
    .select("id, organization_id, requested_by, field_key, suggestion_limit, payload")
    .eq("organization_id", organizationId)
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(maxJobs);
  if (!jobs?.length) return 0;
  const repo = getFieldRepository();
  let processed = 0;
  for (const job of jobs) {
    const jobId = job.id as string;
    await admin.from("enrichment_jobs").update({ status: "running" }).eq("id", jobId).eq("organization_id", organizationId);
    try {
      const fieldKey = String(job.field_key);
      const suggestionLimit = Number(job.suggestion_limit ?? 5);
      const payload = (job.payload as { inputs?: string[] } | null) ?? {};
      const inputs = (payload.inputs ?? []).map((entry) => String(entry).trim()).filter(Boolean).slice(0, 500);
      const fieldType = await repo.getFieldTypeByKey(fieldKey);
      if (!fieldType || inputs.length === 0) {
        await admin
          .from("enrichment_jobs")
          .update({ status: "failed", error_message: "Invalid field key or empty inputs." })
          .eq("id", jobId)
          .eq("organization_id", organizationId);
        continue;
      }
      const existingValues = await repo.getValuesByFieldKey(fieldKey);
      const existingLabels = existingValues.map((entry) => entry.label);
      let createdCount = 0;
      for (const input of inputs) {
        const ai = await suggestPackEnrichments({
          fieldKey,
          fieldName: fieldType.name,
          input,
          existingLabels,
          limit: suggestionLimit,
        });
        const proposals = await createEnrichmentProposals({
          organizationId,
          fieldTypeId: fieldType.id,
          sourceInput: input,
          provider: ai.provider,
          model: ai.model,
          actorId: String(job.requested_by),
          suggestions: ai.suggestions,
        });
        createdCount += proposals.length;
      }
      await admin
        .from("enrichment_jobs")
        .update({
          status: "completed",
          created_count: createdCount,
          skipped_count: Math.max(inputs.length - createdCount, 0),
          error_message: null,
        })
        .eq("id", jobId)
        .eq("organization_id", organizationId);
      processed += 1;
    } catch (error) {
      await admin
        .from("enrichment_jobs")
        .update({
          status: "failed",
          error_message: error instanceof Error ? error.message : "Unknown enrichment worker error",
        })
        .eq("id", jobId)
        .eq("organization_id", organizationId);
    }
  }
  return processed;
}

export async function processPendingEnrichmentJobsAcrossOrganizations(maxJobsPerOrg = 3): Promise<number> {
  const admin = getSupabaseServiceClient();
  if (!admin) return 0;
  const { data: pending } = await admin
    .from("enrichment_jobs")
    .select("organization_id")
    .eq("status", "pending")
    .limit(500);
  const orgIds = [...new Set((pending ?? []).map((row) => String(row.organization_id)).filter(Boolean))];
  let total = 0;
  for (const orgId of orgIds) {
    total += await processPendingEnrichmentJobs(orgId, maxJobsPerOrg);
  }
  return total;
}
