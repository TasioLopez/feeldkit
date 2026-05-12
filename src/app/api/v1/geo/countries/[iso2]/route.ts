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
  const crosswalkRows = await repo.getCrosswalksByFromValueId(item.id);
  const crosswalks: Array<{
    crosswalk_type: string;
    confidence: number;
    source: string | null;
    crosswalk_metadata: Record<string, unknown>;
    to_field_key: string;
    to_value_key: string;
    to_label: string;
    to_metadata: Record<string, unknown>;
  }> = [];
  for (const cw of crosswalkRows) {
    const resolved = await repo.resolveCrosswalkTarget(cw);
    if (!resolved) continue;
    crosswalks.push({
      crosswalk_type: cw.crosswalkType,
      confidence: cw.confidence,
      source: cw.source,
      crosswalk_metadata: cw.metadata ?? {},
      to_field_key: resolved.fieldType.key,
      to_value_key: resolved.value.key,
      to_label: resolved.value.label,
      to_metadata: resolved.value.metadata as Record<string, unknown>,
    });
  }
  return NextResponse.json({ country: item, crosswalks });
});
