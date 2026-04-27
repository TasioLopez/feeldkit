import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

async function run() {
  const packKey = process.argv[2];
  const nextVersion = process.argv[3];
  if (!packKey || !nextVersion) {
    console.error("Usage: npm run update:pack -- <pack-key> <version>");
    process.exit(1);
  }

  const registryPath = resolve(process.cwd(), ".generated", "imports-registry.json");
  const previous = await readFile(registryPath, "utf8").catch(() => "[]");
  const registry = JSON.parse(previous) as Array<Record<string, unknown>>;
  const updated = registry.map((entry) =>
    entry.pack_key === packKey
      ? {
          ...entry,
          version: nextVersion,
          updated_at: new Date().toISOString(),
        }
      : entry,
  );
  await writeFile(registryPath, JSON.stringify(updated, null, 2));
  console.log(`Updated pack ${packKey} -> ${nextVersion}`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
