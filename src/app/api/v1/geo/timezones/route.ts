import { NextResponse } from "next/server";
import { createScopedHandler } from "@/lib/api/endpoint";
import { listTimezonesByCountry } from "@/lib/packs/geo/timezone-resolver";

export const GET = createScopedHandler("read:fields", async (request) => {
  const country = new URL(request.url).searchParams.get("country") ?? "";
  return NextResponse.json({ items: await listTimezonesByCountry(country) });
});
