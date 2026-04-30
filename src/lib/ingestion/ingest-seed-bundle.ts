import type { SupabaseClient } from "@supabase/supabase-js";
import type { SeedPack } from "@/data/packs/types";
import { ingestPack } from "@/lib/ingestion/ingest-pack";
import type { seedCrosswalks } from "@/data/seed-crosswalks";

export function mergePacks(packs: SeedPack[]): Map<string, SeedPack> {
  const map = new Map<string, SeedPack>();
  for (const pack of packs) {
    const existing = map.get(pack.key);
    if (!existing) {
      map.set(pack.key, { ...pack, fieldTypes: [...pack.fieldTypes] });
      continue;
    }
    const existingTypes = new Set(existing.fieldTypes.map((ft) => ft.key));
    for (const fieldType of pack.fieldTypes) {
      if (existingTypes.has(fieldType.key)) continue;
      existing.fieldTypes.push(fieldType);
      existingTypes.add(fieldType.key);
    }
  }
  return map;
}

type CrosswalkSeed = (typeof seedCrosswalks)[number];

export async function ingestCrosswalksFromSeed(
  admin: SupabaseClient,
  crosswalks: CrosswalkSeed[],
  source = "seed-crosswalks",
  options?: { strict?: boolean },
): Promise<{
  inserted: number;
  skipped_missing_field_type: number;
  skipped_missing_value: number;
  errors: number;
}> {
  const { data: fieldTypes } = await admin.from("field_types").select("id,key");
  const typeIdByKey = new Map((fieldTypes ?? []).map((row) => [row.key as string, row.id as string]));

  let inserted = 0;
  let skippedMissingFieldType = 0;
  let skippedMissingValue = 0;
  let errors = 0;
  for (const cw of crosswalks) {
    const fromTypeId = typeIdByKey.get(cw.fromFieldTypeKey);
    const toTypeId = typeIdByKey.get(cw.toFieldTypeKey);
    if (!fromTypeId || !toTypeId) {
      skippedMissingFieldType += 1;
      continue;
    }
    const [{ data: fromValue }, { data: toValue }] = await Promise.all([
      admin
        .from("field_values")
        .select("id")
        .eq("field_type_id", fromTypeId)
        .eq("key", cw.fromValueKey)
        .maybeSingle(),
      admin
        .from("field_values")
        .select("id")
        .eq("field_type_id", toTypeId)
        .eq("key", cw.toValueKey)
        .maybeSingle(),
    ]);
    if (!fromValue?.id || !toValue?.id) {
      skippedMissingValue += 1;
      continue;
    }
    const { error } = await admin.from("field_crosswalks").upsert(
      {
        from_field_type_id: fromTypeId,
        from_value_id: fromValue.id,
        to_field_type_id: toTypeId,
        to_value_id: toValue.id,
        crosswalk_type: cw.crosswalkType,
        confidence: cw.confidence,
        source: cw.source ?? source,
        metadata: {},
      },
      { onConflict: "from_value_id,to_value_id,crosswalk_type" },
    );
    if (!error) inserted += 1;
    else errors += 1;
  }
  if (options?.strict && (errors > 0 || skippedMissingFieldType > 0 || skippedMissingValue > 0)) {
    throw new Error(
      `ingestCrosswalksFromSeed strict failure: errors=${errors} skipped_missing_field_type=${skippedMissingFieldType} skipped_missing_value=${skippedMissingValue}`,
    );
  }
  return {
    inserted,
    skipped_missing_field_type: skippedMissingFieldType,
    skipped_missing_value: skippedMissingValue,
    errors,
  };
}

export async function ingestSeedBundle(
  admin: SupabaseClient,
  packs: SeedPack[],
  options?: { sourceKeyPrefix?: string; forceVersionSnapshot?: boolean; forceOverwrite?: boolean },
): Promise<{
  packs: number;
  fieldTypes: number;
  fieldValues: number;
  aliases: number;
  insertedValues: number;
  updatedValues: number;
  skippedProtectedValues: number;
}> {
  const merged = mergePacks(packs);
  let fieldTypes = 0;
  let fieldValues = 0;
  let aliases = 0;
  let insertedValues = 0;
  let updatedValues = 0;
  let skippedProtectedValues = 0;
  for (const pack of merged.values()) {
    const result = await ingestPack(admin, pack, {
      sourceKey: `${options?.sourceKeyPrefix ?? "seed"}:${pack.key}`,
      forceVersionSnapshot: options?.forceVersionSnapshot,
      forceOverwrite: options?.forceOverwrite,
    });
    fieldTypes += result.fieldTypes;
    fieldValues += result.fieldValues;
    aliases += result.aliases;
    insertedValues += result.insertedValues;
    updatedValues += result.updatedValues;
    skippedProtectedValues += result.skippedProtectedValues;
  }
  return { packs: merged.size, fieldTypes, fieldValues, aliases, insertedValues, updatedValues, skippedProtectedValues };
}
