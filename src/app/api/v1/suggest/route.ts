import { NextResponse } from "next/server";
import { createScopedHandler } from "@/lib/api/endpoint";
import { normalizeOne, normalizeRequestSchema } from "@/lib/matching/normalize-service";

export const POST = createScopedHandler("normalize", async (request) => {
  const raw = (await request.json()) as Record<string, unknown>;
  const orgId = request.headers.get("x-feeldkit-organization-id");
  const payload = normalizeRequestSchema.safeParse({
    ...raw,
    organization_id: (raw.organization_id as string | undefined) ?? orgId ?? undefined,
  });
  if (!payload.success) {
    return NextResponse.json({ error: "invalid payload", details: payload.error.flatten() }, { status: 400 });
  }
  const result = await normalizeOne(payload.data);
  if (result.status === "matched") {
    result.status = "suggested";
    result.needs_review = false;
  }
  return NextResponse.json(result);
});
