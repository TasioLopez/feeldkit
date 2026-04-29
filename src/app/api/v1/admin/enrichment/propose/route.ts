import { NextResponse } from "next/server";
import { z } from "zod";
import { createScopedHandler } from "@/lib/api/endpoint";
import { getFieldRepository } from "@/lib/repositories/get-field-repository";
import { suggestPackEnrichments } from "@/lib/ai/pack-enricher";
import { createEnrichmentProposals } from "@/lib/enrichment/proposal-service";

const schema = z.object({
  field_key: z.string().min(1),
  input: z.string().min(1),
  limit: z.number().int().min(1).max(10).optional(),
});

export const POST = createScopedHandler("admin:fields", async (request) => {
  const payload = schema.safeParse(await request.json());
  if (!payload.success) {
    return NextResponse.json({ error: "invalid payload", details: payload.error.flatten() }, { status: 400 });
  }

  const organizationId = request.headers.get("x-feeldkit-organization-id");
  const actorId = request.headers.get("x-feeldkit-api-key-id");
  if (!organizationId) {
    return NextResponse.json({ error: "missing organization context" }, { status: 400 });
  }

  const repo = getFieldRepository();
  const fieldType = await repo.getFieldTypeByKey(payload.data.field_key);
  if (!fieldType) {
    return NextResponse.json({ error: "field type not found" }, { status: 404 });
  }
  const values = await repo.getValuesByFieldKey(payload.data.field_key);
  const ai = await suggestPackEnrichments({
    fieldKey: payload.data.field_key,
    fieldName: fieldType.name,
    input: payload.data.input,
    existingLabels: values.map((entry) => entry.label),
    limit: payload.data.limit ?? 3,
  });

  const proposals = await createEnrichmentProposals({
    organizationId,
    fieldTypeId: fieldType.id,
    sourceInput: payload.data.input,
    provider: ai.provider,
    model: ai.model,
    actorId,
    suggestions: ai.suggestions,
  });

  return NextResponse.json({
    field_key: payload.data.field_key,
    input: payload.data.input,
    provider: ai.provider,
    model: ai.model,
    created: proposals.length,
    proposals,
  });
});
