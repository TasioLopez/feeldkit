import { NextResponse } from "next/server";
import { createScopedHandler } from "@/lib/api/endpoint";
import { getFieldRepository } from "@/lib/repositories/get-field-repository";

export const GET = createScopedHandler("read:fields", async (request) => {
  const iso2 = new URL(request.url).pathname.split("/").filter(Boolean).at(-1)?.toUpperCase() ?? "";
  const repo = getFieldRepository();
  const items = await repo.getValuesByFieldKey("countries");
  const item = items.find((entry) => String(entry.metadata.iso2 ?? "").toUpperCase() === iso2);
  if (!item) {
    return NextResponse.json({ error: "country not found" }, { status: 404 });
  }
  return NextResponse.json(item);
});
