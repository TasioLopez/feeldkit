import { NextResponse } from "next/server";
import { getFieldRepository } from "@/lib/repositories/get-field-repository";
import { parseCanonicalRefV1 } from "@/lib/domain/canonical-ref";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const packKey = url.searchParams.get("packKey");
  if (!packKey) {
    return NextResponse.json({ error: "packKey is required" }, { status: 400 });
  }

  const repo = getFieldRepository();
  const pack = await repo.getPackByKey(packKey);
  if (!pack) {
    return NextResponse.json({ error: "Pack not found" }, { status: 404 });
  }
  const types = (await repo.getFieldTypes()).filter((entry) => entry.fieldPackId === pack.id);
  const typeRows = await Promise.all(
    types.map(async (type) => {
      const values = await repo.getValuesByFieldKey(type.key);
      const canonicalRef = parseCanonicalRefV1(type.metadataSchema);
      return {
        id: type.id,
        key: type.key,
        name: type.name,
        totalValues: values.length,
        canonicalRef,
        previewValues: values.slice(0, 12).map((value) => ({ id: value.id, key: value.key, label: value.label })),
      };
    }),
  );

  return NextResponse.json({
    pack: { key: pack.key, name: pack.name, id: pack.id },
    fieldTypes: typeRows,
  });
}
