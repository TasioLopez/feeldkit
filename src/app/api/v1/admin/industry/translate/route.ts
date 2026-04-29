import { NextResponse } from "next/server";
import { z } from "zod";
import { createScopedHandler } from "@/lib/api/endpoint";
import { translateIndustryCode } from "@/lib/industry/concept-service";

const schema = z.object({
  code_system: z.enum(["linkedin", "naics", "nace", "isic", "sic", "gics", "practical"]),
  code: z.string().min(1),
  target_systems: z
    .array(z.enum(["linkedin", "naics", "nace", "isic", "sic", "gics", "practical"]))
    .min(1)
    .max(7),
});

export const POST = createScopedHandler("read:fields", async (request) => {
  const payload = schema.safeParse(await request.json());
  if (!payload.success) {
    return NextResponse.json({ error: "invalid payload", details: payload.error.flatten() }, { status: 400 });
  }
  const result = await translateIndustryCode({
    codeSystem: payload.data.code_system,
    code: payload.data.code.trim(),
    targetSystems: payload.data.target_systems,
  });
  if (!result.concept) {
    return NextResponse.json({ error: "industry code not found" }, { status: 404 });
  }
  return NextResponse.json(result);
});
