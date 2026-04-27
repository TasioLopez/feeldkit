import { NextResponse } from "next/server";
import { createScopedHandler } from "@/lib/api/endpoint";
import { getFieldRepository } from "@/lib/repositories/get-field-repository";

export const GET = createScopedHandler("read:fields", async (request) => {
  const packKey = new URL(request.url).pathname.split("/").filter(Boolean).at(-2) ?? "";
  const repo = getFieldRepository();
  const pack = await repo.getPackByKey(packKey);
  if (!pack) {
    return NextResponse.json({ error: "pack not found" }, { status: 404 });
  }
  const types = (await repo.getFieldTypes()).filter((entry) => entry.fieldPackId === pack.id);
  const field_types = await Promise.all(
    types.map(async (entry) => ({
      key: entry.key,
      name: entry.name,
      values: (await repo.getValuesByFieldKey(entry.key)).map((value) => ({
        key: value.key,
        label: value.label,
      })),
    })),
  );
  return NextResponse.json({
    pack: { key: pack.key, name: pack.name, version: pack.version },
    field_types,
  });
});
