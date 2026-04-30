import { NextResponse } from "next/server";
import { getFieldRepository } from "@/lib/repositories/get-field-repository";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const iso2 = url.searchParams.get("country_iso2")?.trim();
  const countryKey = url.searchParams.get("country_key")?.trim();

  if (!iso2 && !countryKey) {
    return NextResponse.json({ error: "country_iso2 or country_key is required" }, { status: 400 });
  }

  const repo = getFieldRepository();
  const countries = await repo.getValuesByFieldKey("countries");
  let resolved = countryKey ? countries.find((v) => v.key === countryKey) : null;
  if (!resolved && iso2) {
    const upper = iso2.toUpperCase();
    resolved = countries.find((v) => String((v.metadata as { iso2?: string }).iso2 ?? "").toUpperCase() === upper) ?? null;
  }

  if (!resolved) {
    return NextResponse.json({ error: "Country not found" }, { status: 404 });
  }

  const rows = await repo.getCrosswalksByFrom("countries", resolved.key);
  const edges = [];
  for (const row of rows) {
    const target = await repo.resolveCrosswalkTarget(row);
    if (!target) continue;
    edges.push({
      crosswalk_type: row.crosswalkType,
      confidence: row.confidence,
      source: row.source,
      to_field_key: target.fieldType.key,
      to_value: { key: target.value.key, label: target.value.label, metadata: target.value.metadata },
    });
  }

  return NextResponse.json({
    country: { key: resolved.key, label: resolved.label, metadata: resolved.metadata },
    related: edges,
    trace: {
      resolved_country_key: resolved.key,
      crosswalk_count: edges.length,
    },
  });
}
