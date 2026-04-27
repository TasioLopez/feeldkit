import { NextResponse } from "next/server";
import { createScopedHandler } from "@/lib/api/endpoint";
import { parseFieldValue, parsePayloadSchema } from "@/lib/parsing/parser-service";

export const POST = createScopedHandler("parse", async (request) => {
  const payload = parsePayloadSchema.safeParse(await request.json());
  if (!payload.success) {
    return NextResponse.json({ error: "invalid payload", details: payload.error.flatten() }, { status: 400 });
  }
  return NextResponse.json(parseFieldValue(payload.data));
});
