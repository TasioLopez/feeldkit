import { NextResponse } from "next/server";
import { z } from "zod";
import { createScopedHandler } from "@/lib/api/endpoint";
import { getFieldRepository } from "@/lib/repositories/get-field-repository";
import { suggestPackEnrichments } from "@/lib/ai/pack-enricher";
import { createEnrichmentProposals } from "@/lib/enrichment/proposal-service";

const itemSchema = z.object({
  field_key: z.string().min(1),
  input: z.string().min(1),
  limit: z.number().int().min(1).max(10).optional(),
});
const schema = z.object({
  items: z.array(itemSchema).min(1).max(50),
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
  const results: Array<{ field_key: string; input: string; created: number }> = [];
  for (const item of payload.data.items) {
    const fieldType = await repo.getFieldTypeByKey(item.field_key);
    if (!fieldType) {
      results.push({ field_key: item.field_key, input: item.input, created: 0 });
      continue;
    }
    const values = await repo.getValuesByFieldKey(item.field_key);
    const ai = await suggestPackEnrichments({
      fieldKey: item.field_key,
      fieldName: fieldType.name,
      input: item.input,
      existingLabels: values.map((entry) => entry.label),
      limit: item.limit ?? 3,
    });
    const proposals = await createEnrichmentProposals({
      organizationId,
      fieldTypeId: fieldType.id,
      sourceInput: item.input,
      provider: ai.provider,
      model: ai.model,
      actorId,
      suggestions: ai.suggestions,
    });
    results.push({ field_key: item.field_key, input: item.input, created: proposals.length });
  }

  return NextResponse.json({
    created_total: results.reduce((acc, item) => acc + item.created, 0),
    results,
  });
});
