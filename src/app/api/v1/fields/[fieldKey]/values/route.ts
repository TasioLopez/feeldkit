import { NextResponse } from "next/server";
import { createScopedHandler } from "@/lib/api/endpoint";
import { getFieldRepository } from "@/lib/repositories/get-field-repository";

export const GET = createScopedHandler("read:fields", async (request) => {
  const path = new URL(request.url).pathname;
  const fieldKey = path.split("/").filter(Boolean).at(-2) ?? "";
  const repo = getFieldRepository();
  const fieldType = await repo.getFieldTypeByKey(fieldKey);
  if (!fieldType) {
    return NextResponse.json({ error: "field type not found" }, { status: 404 });
  }
  return NextResponse.json({
    field_key: fieldKey,
    values: await repo.getValuesByFieldKey(fieldKey),
  });
});
