import { NextResponse } from "next/server";
import { createScopedHandler } from "@/lib/api/endpoint";
import { parseDomain } from "@/lib/packs/web-identity/domain-parser";

export const GET = createScopedHandler("parse", async (request) => {
  const value = new URL(request.url).searchParams.get("value") ?? "";
  return NextResponse.json(parseDomain(value));
});
