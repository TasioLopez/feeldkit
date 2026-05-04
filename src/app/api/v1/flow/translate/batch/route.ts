import { NextResponse } from "next/server";
import { z } from "zod";
import { createScopedHandler } from "@/lib/api/endpoint";
import { runFlowBatch, flowTranslateRequestSchema } from "@/lib/flows/run-flow";

const batchSchema = z.object({
  items: z.array(flowTranslateRequestSchema).min(1).max(100),
});

export const POST = createScopedHandler("normalize", async (request) => {
  const raw = (await request.json()) as { items?: Array<Record<string, unknown>> };
  const orgId = request.headers.get("x-feeldkit-organization-id");
  const payload = batchSchema.safeParse({
    items:
      raw.items?.map((item) => ({
        ...item,
        organization_id: (item.organization_id as string | undefined) ?? orgId ?? undefined,
      })) ?? [],
  });
  if (!payload.success) {
    return NextResponse.json({ error: "invalid payload", details: payload.error.flatten() }, { status: 400 });
  }
  return NextResponse.json({ items: await runFlowBatch(payload.data.items) });
});
