import { NextResponse } from "next/server";
import { createScopedHandler } from "@/lib/api/endpoint";
import { classifyEmail } from "@/lib/packs/email-domain/email-classifier";

export const GET = createScopedHandler("read:fields", async (request) => {
  const value = new URL(request.url).searchParams.get("value") ?? "";
  return NextResponse.json(await classifyEmail(value));
});
