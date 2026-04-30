import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { seedPacks } from "../src/data/packs/index";
import { seedCrosswalks } from "../src/data/seed-crosswalks";
import { ingestCrosswalksFromSeed, ingestSeedBundle, mergePacks } from "../src/lib/ingestion/ingest-seed-bundle";

async function seedSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }
  const admin = createClient(url, key);
  const summary = await ingestSeedBundle(admin, seedPacks, { sourceKeyPrefix: "seed", forceVersionSnapshot: false });
  const crosswalks = await ingestCrosswalksFromSeed(admin, seedCrosswalks, "seed-crosswalks");
  console.log(
    `Supabase seed completed. packs=${summary.packs} field_types=${summary.fieldTypes} values=${summary.fieldValues} aliases=${summary.aliases} crosswalks=${crosswalks.inserted}`,
  );
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
