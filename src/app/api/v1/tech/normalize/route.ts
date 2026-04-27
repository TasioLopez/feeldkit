import { NextResponse } from "next/server";
import { createScopedHandler } from "@/lib/api/endpoint";
import { normalizeTechnology } from "@/lib/packs/tech/technology-normalizer";

export const GET = createScopedHandler("normalize", async (request) => {
  const value = new URL(request.url).searchParams.get("q") ?? "";
  return NextResponse.json(await normalizeTechnology(value));
});
