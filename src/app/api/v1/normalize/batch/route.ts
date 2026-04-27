import { NextResponse } from "next/server";
import { z } from "zod";
import { createScopedHandler } from "@/lib/api/endpoint";
import { normalizeBatch, normalizeRequestSchema } from "@/lib/matching/normalize-service";

const batchSchema = z.object({
  items: z.array(normalizeRequestSchema).min(1).max(100),
});

export const POST = createScopedHandler("normalize", async (request) => {
  const payload = batchSchema.safeParse(await request.json());
  if (!payload.success) {
    return NextResponse.json({ error: "invalid payload", details: payload.error.flatten() }, { status: 400 });
  }
  return NextResponse.json({ items: await normalizeBatch(payload.data.items) });
});
