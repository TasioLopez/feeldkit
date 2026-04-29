"use server";

import { z } from "zod";
import { assertAdminRole, getAdminActorContext } from "@/lib/auth/admin-context";
import { getFieldRepository } from "@/lib/repositories/get-field-repository";
import { suggestPackEnrichments } from "@/lib/ai/pack-enricher";
import { createEnrichmentProposals } from "@/lib/enrichment/proposal-service";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { createEnrichmentJob, processPendingEnrichmentJobs } from "@/lib/enrichment/job-service";

const singleSchema = z.object({
  fieldKey: z.string().min(1),
  input: z.string().min(1),
  limit: z.number().int().min(1).max(10).default(5),
});

const batchSchema = z.object({
  fieldKey: z.string().min(1),
  inputs: z.array(z.string().min(1)).min(1).max(200),
  limit: z.number().int().min(1).max(10).default(5),
});

export type EnrichmentRunResult = {
  ok: boolean;
  mode?: "sync" | "queued";
  fieldKey?: string;
  submitted?: number;
  created?: number;
  skipped?: number;
  provider?: string;
  model?: string;
  queuedJobId?: string;
  error?: string;
};

async function ensureAdminActor() {
  const actor = await getAdminActorContext();
  if (!actor) {
    return { error: "Not authenticated." } as const;
  }
  try {
    assertAdminRole(actor.role, "run enrichment");
  } catch {
    return { error: "Insufficient role for enrichment." } as const;
  }
  return { actor } as const;
}

function enforceRunRateLimit(organizationId: string, actorId: string): boolean {
  return checkRateLimit(`enrichment:${organizationId}:${actorId}`);
}

async function runOne(fieldKey: string, input: string, limit: number, organizationId: string, actorId: string) {
  const repo = getFieldRepository();
  const fieldType = await repo.getFieldTypeByKey(fieldKey);
  if (!fieldType) {
    return { created: 0, provider: "n/a", model: "n/a" };
  }
  const values = await repo.getValuesByFieldKey(fieldKey);
  const ai = await suggestPackEnrichments({
    fieldKey,
    fieldName: fieldType.name,
    input,
    existingLabels: values.map((entry) => entry.label),
    limit,
  });
  const proposals = await createEnrichmentProposals({
    organizationId,
    fieldTypeId: fieldType.id,
    sourceInput: input,
    provider: ai.provider,
    model: ai.model,
    actorId,
    suggestions: ai.suggestions,
  });
  return {
    created: proposals.length,
    provider: ai.provider,
    model: ai.model,
  };
}

export async function runSingleEnrichmentAction(input: {
  fieldKey: string;
  input: string;
  limit?: number;
}): Promise<EnrichmentRunResult> {
  const actorResult = await ensureAdminActor();
  if ("error" in actorResult) return { ok: false, error: actorResult.error };
  const parsed = singleSchema.safeParse({ ...input, limit: input.limit ?? 5 });
  if (!parsed.success) {
    return { ok: false, error: "Invalid payload." };
  }
  if (!enforceRunRateLimit(actorResult.actor.organizationId, actorResult.actor.userId)) {
    return { ok: false, error: "Rate limit exceeded. Try again shortly." };
  }
  const result = await runOne(
    parsed.data.fieldKey,
    parsed.data.input,
    parsed.data.limit,
    actorResult.actor.organizationId,
    actorResult.actor.userId,
  );
  return {
    ok: true,
    mode: "sync",
    fieldKey: parsed.data.fieldKey,
    submitted: 1,
    created: result.created,
    skipped: Math.max(1 - result.created, 0),
    provider: result.provider,
    model: result.model,
  };
}

export async function runBatchEnrichmentAction(input: {
  fieldKey: string;
  rawInputs: string;
  limit?: number;
}): Promise<EnrichmentRunResult> {
  const actorResult = await ensureAdminActor();
  if ("error" in actorResult) return { ok: false, error: actorResult.error };
  const inputs = input.rawInputs
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean);
  const parsed = batchSchema.safeParse({ fieldKey: input.fieldKey, inputs, limit: input.limit ?? 5 });
  if (!parsed.success) {
    return { ok: false, error: "Invalid batch payload." };
  }
  if (!enforceRunRateLimit(actorResult.actor.organizationId, actorResult.actor.userId)) {
    return { ok: false, error: "Rate limit exceeded. Try again shortly." };
  }
  const syncMaxInputs = Math.max(1, Number(process.env.FEELDKIT_ENRICHMENT_SYNC_MAX_INPUTS ?? 25));
  if (parsed.data.inputs.length > syncMaxInputs) {
    const job = await createEnrichmentJob({
      organizationId: actorResult.actor.organizationId,
      requestedBy: actorResult.actor.userId,
      fieldKey: parsed.data.fieldKey,
      limit: parsed.data.limit,
      inputs: parsed.data.inputs,
    });
    if (!job) {
      return { ok: false, error: "Unable to queue enrichment job." };
    }
    return {
      ok: true,
      mode: "queued",
      fieldKey: parsed.data.fieldKey,
      submitted: parsed.data.inputs.length,
      created: 0,
      skipped: 0,
      queuedJobId: job.id,
      provider: "queued",
      model: "queued",
    };
  }
  let created = 0;
  let provider = "n/a";
  let model = "n/a";
  for (const entry of parsed.data.inputs) {
    const result = await runOne(
      parsed.data.fieldKey,
      entry,
      parsed.data.limit,
      actorResult.actor.organizationId,
      actorResult.actor.userId,
    );
    created += result.created;
    provider = result.provider;
    model = result.model;
  }
  return {
    ok: true,
    mode: "sync",
    fieldKey: parsed.data.fieldKey,
    submitted: parsed.data.inputs.length,
    created,
    skipped: Math.max(parsed.data.inputs.length - created, 0),
    provider,
    model,
  };
}

export async function processQueuedEnrichmentJobsAction(): Promise<EnrichmentRunResult> {
  const actorResult = await ensureAdminActor();
  if ("error" in actorResult) return { ok: false, error: actorResult.error };
  const processed = await processPendingEnrichmentJobs(actorResult.actor.organizationId, 5);
  return {
    ok: true,
    mode: "sync",
    submitted: processed,
    created: processed,
    skipped: 0,
    provider: "worker",
    model: "worker",
  };
}
