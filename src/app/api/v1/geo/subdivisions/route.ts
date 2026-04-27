import { NextResponse } from "next/server";
import { createScopedHandler } from "@/lib/api/endpoint";
import { getFieldRepository } from "@/lib/repositories/get-field-repository";

export const GET = createScopedHandler("read:fields", async (request) => {
  const country = (new URL(request.url).searchParams.get("country") ?? "").toUpperCase();
  const repo = getFieldRepository();
  const all = await repo.getValuesByFieldKey("subdivisions");
  const items = all.filter((entry) =>
    country ? String(entry.metadata.country_iso2 ?? "").toUpperCase() === country : true,
  );
  return NextResponse.json({ items });
});
