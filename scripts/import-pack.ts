import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { seedPacks } from "../src/data/packs";

async function run() {
  const packKey = process.argv[2];
  if (!packKey) {
    console.error("Usage: npm run import:pack -- <pack-key>");
    process.exit(1);
  }

  const pack = seedPacks.find((entry) => entry.key === packKey);
  if (!pack) {
    console.error(`Pack not found: ${packKey}`);
    process.exit(1);
  }

  const generatedDir = resolve(process.cwd(), ".generated");
  await mkdir(generatedDir, { recursive: true });
  const registryPath = resolve(generatedDir, "imports-registry.json");
  const previous = await readFile(registryPath, "utf8").catch(() => "[]");
  const registry = JSON.parse(previous) as Array<Record<string, unknown>>;

  const next = [
    ...registry.filter((entry) => entry.pack_key !== pack.key),
    {
      pack_key: pack.key,
      imported_at: new Date().toISOString(),
      version: pack.version,
      source: pack.source,
      field_type_count: pack.fieldTypes.length,
    },
  ];
  await writeFile(registryPath, JSON.stringify(next, null, 2));
  console.log(`Imported pack: ${pack.key}`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
