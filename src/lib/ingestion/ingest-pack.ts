import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeText } from "@/lib/matching/normalize-text";
import type { SeedPack } from "@/data/packs/types";

function packCategory(key: string): string {
  if (key === "geo" || key === "standards") {
    return "standards";
  }
  if (key === "email_domain" || key === "tech") {
    return "normalization_map";
  }
  return "taxonomy";
}

type IngestResult = {
  packId: string;
  fieldTypes: number;
  fieldValues: number;
  aliases: number;
  insertedValues: number;
  updatedValues: number;
  skippedProtectedValues: number;
};

export async function ingestPack(
  admin: SupabaseClient,
  pack: SeedPack,
  opts?: {
    sourceKey?: string;
    actorId?: string | null;
    forceVersionSnapshot?: boolean;
    forceOverwrite?: boolean;
  },
): Promise<IngestResult> {
  const sourceKey = opts?.sourceKey ?? `seed:${pack.source}`;
  const { data: packRow, error: packErr } = await admin
    .from("field_packs")
    .upsert(
      {
        key: pack.key,
        name: pack.name,
        description: `${pack.name} (${sourceKey})`,
        category: packCategory(pack.key),
        status: "active",
        version: pack.version,
        source_type: "imported",
        is_public: true,
        is_system: true,
        metadata: { source_key: sourceKey, seed_source: pack.source },
      },
      { onConflict: "key" },
    )
    .select("id")
    .single();
  if (packErr || !packRow) {
    throw new Error(`field_packs upsert failed for ${pack.key}: ${packErr?.message ?? "unknown error"}`);
  }
  const packId = packRow.id as string;

  const { data: existingSource } = await admin.from("import_sources").select("id").eq("key", sourceKey).maybeSingle();
  if (!existingSource) {
    await admin.from("import_sources").upsert(
      {
        key: sourceKey,
        name: `${pack.name} source`,
        version: pack.version,
        retrieved_at: new Date().toISOString(),
        metadata: { pack_key: pack.key, source: pack.source },
      },
      { onConflict: "key" },
    );
  }

  const { data: lastVersion } = await admin
    .from("field_pack_versions")
    .select("version")
    .eq("field_pack_id", packId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (opts?.forceVersionSnapshot || !lastVersion || lastVersion.version !== pack.version) {
    await admin.from("field_pack_versions").insert({
      field_pack_id: packId,
      version: pack.version,
      changelog: `Ingested from ${sourceKey}`,
      source_snapshot: {
        source_key: sourceKey,
        source: pack.source,
        field_type_count: pack.fieldTypes.length,
        ingested_at: new Date().toISOString(),
      },
      created_by: opts?.actorId ?? null,
    });
  }

  let typeCount = 0;
  let valueCount = 0;
  let aliasCount = 0;
  let insertedValues = 0;
  let updatedValues = 0;
  let skippedProtectedValues = 0;
  for (const ft of pack.fieldTypes) {
    const { data: typeRow, error: typeErr } = await admin
      .from("field_types")
      .upsert(
        {
          field_pack_id: packId,
          key: ft.key,
          name: ft.name,
          description: "",
          kind: "taxonomy",
          status: "active",
          is_public: true,
          supports_hierarchy: false,
          supports_relationships: false,
          supports_locale: false,
          supports_validation: false,
          supports_crosswalks: true,
          metadata_schema: {},
        },
        { onConflict: "field_pack_id,key" },
      )
      .select("id")
      .single();
    if (typeErr || !typeRow) {
      throw new Error(`field_types upsert failed for ${ft.key}: ${typeErr?.message ?? "unknown error"}`);
    }
    typeCount += 1;
    const typeId = typeRow.id as string;

    for (const value of ft.values) {
      const normalizedLabel = normalizeText(value.label);
      const { data: existingValue } = await admin
        .from("field_values")
        .select("id, metadata, source")
        .eq("field_type_id", typeId)
        .eq("key", value.key)
        .maybeSingle();
      const existingMetadata = (existingValue?.metadata as Record<string, unknown> | null) ?? null;
      const preserveApproved =
        !opts?.forceOverwrite &&
        Boolean(
          existingMetadata?.source_ai_approved === true ||
            existingMetadata?.manual_override === true ||
            existingValue?.source === "review_approval" ||
            existingValue?.source === "ai_proposal",
        );
      if (preserveApproved && existingValue?.id) {
        skippedProtectedValues += 1;
        for (const alias of value.aliases ?? []) {
          const normalizedAlias = normalizeText(alias);
          await admin.from("field_aliases").upsert(
            {
              field_value_id: existingValue.id as string,
              field_type_id: typeId,
              alias,
              normalized_alias: normalizedAlias,
              locale: null,
              source: sourceKey,
              confidence: 0.95,
              status: "active",
            },
            { onConflict: "field_type_id,normalized_alias" },
          );
          aliasCount += 1;
        }
        continue;
      }
      const isUpdate = Boolean(existingValue?.id);
      const { data: valueRow, error: valueErr } = await admin
        .from("field_values")
        .upsert(
          {
            field_type_id: typeId,
            key: value.key,
            label: value.label,
            normalized_label: normalizedLabel,
            locale: null,
            description: null,
            parent_id: null,
            sort_order: 0,
            status: "active",
            metadata: {
              ...(value.metadata ?? {}),
              source_standard: (value.metadata?.source_standard as string | undefined) ?? null,
              source_overlay: (value.metadata?.source_overlay as string | undefined) ?? null,
            },
            source: sourceKey,
            source_id: null,
          },
          { onConflict: "field_type_id,key" },
        )
        .select("id")
        .single();
      if (valueErr || !valueRow) {
        throw new Error(`field_values upsert failed for ${ft.key}:${value.key}: ${valueErr?.message ?? "unknown error"}`);
      }
      valueCount += 1;
      if (isUpdate) {
        updatedValues += 1;
      } else {
        insertedValues += 1;
      }

      for (const alias of value.aliases ?? []) {
        const normalizedAlias = normalizeText(alias);
        const { error: aliasErr } = await admin.from("field_aliases").upsert(
          {
            field_value_id: valueRow.id,
            field_type_id: typeId,
            alias,
            normalized_alias: normalizedAlias,
            locale: null,
            source: sourceKey,
            confidence: 0.95,
            status: "active",
          },
          { onConflict: "field_type_id,normalized_alias" },
        );
        if (aliasErr) {
          throw new Error(`field_aliases upsert failed for ${ft.key}:${value.key}: ${aliasErr.message}`);
        }
        aliasCount += 1;
      }
    }
  }

  return {
    packId,
    fieldTypes: typeCount,
    fieldValues: valueCount,
    aliases: aliasCount,
    insertedValues,
    updatedValues,
    skippedProtectedValues,
  };
}
