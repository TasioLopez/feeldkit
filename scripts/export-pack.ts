import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { seedPacks } from "../src/data/packs";

async function run() {
  const packKey = process.argv[2];
  if (!packKey) {
    console.error("Usage: npm run export:pack -- <pack-key>");
    process.exit(1);
  }
  const packsToExport =
    packKey === "standards"
      ? [...seedPacks].filter((entry) => entry.key.startsWith("standards_")).sort((a, b) => a.key.localeCompare(b.key))
      : seedPacks.filter((entry) => entry.key === packKey);

  if (!packsToExport.length) {
    console.error(`Pack not found: ${packKey}`);
    process.exit(1);
  }

  const exportDir = resolve(process.cwd(), ".generated", "exports");
  await mkdir(exportDir, { recursive: true });
  if (packKey === "standards" && packsToExport.length > 1) {
    const filePath = resolve(exportDir, "standards-modules.json");
    await writeFile(filePath, JSON.stringify({ modules: packsToExport }, null, 2));
    console.log(`Exported: ${filePath}`);
    return;
  }
  const pack = packsToExport[0]!;
  const filePath = resolve(exportDir, `${pack.key}.json`);
  await writeFile(filePath, JSON.stringify(pack, null, 2));
  console.log(`Exported: ${filePath}`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
