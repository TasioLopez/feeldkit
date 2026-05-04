import { NextResponse } from "next/server";
import { createScopedHandler } from "@/lib/api/endpoint";
import { runFlow, flowTranslateRequestSchema } from "@/lib/flows/run-flow";

export const POST = createScopedHandler("normalize", async (request) => {
  const raw = (await request.json()) as Record<string, unknown>;
  const orgId = request.headers.get("x-feeldkit-organization-id");
  const payload = flowTranslateRequestSchema.safeParse({
    ...raw,
    organization_id: (raw.organization_id as string | undefined) ?? orgId ?? undefined,
  });
  if (!payload.success) {
    return NextResponse.json({ error: "invalid payload", details: payload.error.flatten() }, { status: 400 });
  }
  const result = await runFlow(payload.data);
  if (result.status === "not_found") {
    return NextResponse.json({ error: "flow_not_found", flow: result.flow }, { status: 404 });
  }
  return NextResponse.json(result);
});
