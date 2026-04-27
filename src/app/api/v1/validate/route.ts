import { NextResponse } from "next/server";
import { createScopedHandler } from "@/lib/api/endpoint";
import { validateFieldValue, validatePayloadSchema } from "@/lib/validation/validation-service";

export const POST = createScopedHandler("validate", async (request) => {
  const payload = validatePayloadSchema.safeParse(await request.json());
  if (!payload.success) {
    return NextResponse.json({ error: "invalid payload", details: payload.error.flatten() }, { status: 400 });
  }
  return NextResponse.json(validateFieldValue(payload.data));
});
