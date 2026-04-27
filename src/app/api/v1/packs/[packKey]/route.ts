import { NextResponse } from "next/server";
import { createScopedHandler } from "@/lib/api/endpoint";
import { getFieldRepository } from "@/lib/repositories/get-field-repository";

export const GET = createScopedHandler("read:packs", async (request) => {
  const path = new URL(request.url).pathname;
  const packKey = path.split("/").filter(Boolean).at(-1) ?? "";
  const repo = getFieldRepository();
  const pack = await repo.getPackByKey(packKey);
  if (!pack) {
    return NextResponse.json({ error: "pack not found" }, { status: 404 });
  }
  const allTypes = await repo.getFieldTypes();
  const fieldTypes = allTypes.filter((entry) => entry.fieldPackId === pack.id);
  return NextResponse.json({ pack, field_types: fieldTypes });
});
