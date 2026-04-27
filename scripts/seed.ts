import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { seedPacks } from "../src/data/packs/index";
import { seedCrosswalks } from "../src/data/seed-crosswalks";
import { normalizeText } from "../src/lib/matching/normalize-text";
import type { SeedPack } from "../src/data/packs/types";

function packCategory(key: string): string {
  if (key === "geo" || key === "standards") {
    return "standards";
  }
  if (key === "email_domain" || key === "tech") {
    return "normalization_map";
  }
  return "taxonomy";
}

function mergePacks(packs: typeof seedPacks): Map<string, SeedPack> {
  const map = new Map<string, SeedPack>();
  for (const pack of packs) {
    const existing = map.get(pack.key);
    if (!existing) {
      map.set(pack.key, {
        ...pack,
        fieldTypes: [...pack.fieldTypes],
      });
    } else {
      const keys = new Set(existing.fieldTypes.map((ft) => ft.key));
      for (const ft of pack.fieldTypes) {
        if (!keys.has(ft.key)) {
          existing.fieldTypes.push(ft);
          keys.add(ft.key);
        }
      }
    }
  }
  return map;
}

async function seedSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }
  const admin = createClient(url, key);

  const merged = mergePacks(seedPacks);
  const typeKeyToId = new Map<string, string>();
  const valueKeyToId = new Map<string, string>();

  for (const pack of merged.values()) {
    const { data: packRow, error: packErr } = await admin
      .from("field_packs")
      .upsert(
        {
          key: pack.key,
          name: pack.name,
          description: `${pack.name} (seed)`,
          category: packCategory(pack.key),
          status: "active",
          version: pack.version,
          source_type: "imported",
          is_public: true,
          is_system: true,
          metadata: { seed_source: pack.source },
        },
        { onConflict: "key" },
      )
      .select("id")
      .single();
    if (packErr || !packRow) {
      console.error("field_packs upsert", pack.key, packErr);
      continue;
    }
    const packId = packRow.id as string;

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
        console.error("field_types upsert", ft.key, typeErr);
        continue;
      }
      const typeId = typeRow.id as string;
      typeKeyToId.set(ft.key, typeId);

      for (const v of ft.values) {
        const normalizedLabel = normalizeText(v.label);
        const { data: valRow, error: valErr } = await admin
          .from("field_values")
          .upsert(
            {
              field_type_id: typeId,
              key: v.key,
              label: v.label,
              normalized_label: normalizedLabel,
              locale: null,
              description: null,
              parent_id: null,
              sort_order: 0,
              status: "active",
              metadata: v.metadata ?? {},
              source: "seed",
              source_id: null,
            },
            { onConflict: "field_type_id,key" },
          )
          .select("id")
          .single();
        if (valErr || !valRow) {
          console.error("field_values upsert", ft.key, v.key, valErr);
          continue;
        }
        const composite = `${ft.key}:${v.key}`;
        valueKeyToId.set(composite, valRow.id as string);

        for (const al of v.aliases ?? []) {
          const na = normalizeText(al);
          await admin.from("field_aliases").upsert(
            {
              field_value_id: valRow.id,
              field_type_id: typeId,
              alias: al,
              normalized_alias: na,
              locale: null,
              source: "seed",
              confidence: 0.95,
              status: "active",
            },
            { onConflict: "field_type_id,normalized_alias" },
          );
        }
      }
    }
  }

  for (const cw of seedCrosswalks) {
    const fromTypeId = typeKeyToId.get(cw.fromFieldTypeKey);
    const toTypeId = typeKeyToId.get(cw.toFieldTypeKey);
    const fromValId = valueKeyToId.get(`${cw.fromFieldTypeKey}:${cw.fromValueKey}`);
    const toValId = valueKeyToId.get(`${cw.toFieldTypeKey}:${cw.toValueKey}`);
    if (!fromTypeId || !toTypeId || !fromValId || !toValId) {
      console.warn("skip crosswalk missing ids", cw);
      continue;
    }
    await admin.from("field_crosswalks").upsert(
      {
        from_field_type_id: fromTypeId,
        from_value_id: fromValId,
        to_field_type_id: toTypeId,
        to_value_id: toValId,
        crosswalk_type: cw.crosswalkType,
        confidence: cw.confidence,
        source: cw.source ?? "seed",
        metadata: {},
      },
      { onConflict: "from_value_id,to_value_id,crosswalk_type" },
    );
  }

  console.log("Supabase seed completed.");
}

async function writePreviewJson() {
  const generatedDir = resolve(process.cwd(), ".generated");
  await mkdir(generatedDir, { recursive: true });
  const outputPath = resolve(generatedDir, "seed-preview.json");
  const merged = mergePacks(seedPacks);
  await writeFile(
    outputPath,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        pack_count: merged.size,
        packs: [...merged.values()].map((p) => ({
          key: p.key,
          name: p.name,
          version: p.version,
          field_type_count: p.fieldTypes.length,
        })),
      },
      null,
      2,
    ),
  );
  console.log(`Seed preview generated: ${outputPath}`);
}

async function run() {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    await seedSupabase();
  }
  await writePreviewJson();
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
