import { NextResponse } from "next/server";
import { createScopedHandler } from "@/lib/api/endpoint";
import { validateSocialUrl } from "@/lib/packs/web-identity/social-url-validator";

export const GET = createScopedHandler("validate", async (request) => {
  const value = new URL(request.url).searchParams.get("value") ?? "";
  return NextResponse.json(validateSocialUrl(value));
});
