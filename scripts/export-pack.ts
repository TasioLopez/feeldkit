import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { seedPacks } from "../src/data/packs";

async function run() {
  const packKey = process.argv[2];
  if (!packKey) {
    console.error("Usage: npm run export:pack -- <pack-key>");
    process.exit(1);
  }
  const pack = seedPacks.find((entry) => entry.key === packKey);
  if (!pack) {
    console.error(`Pack not found: ${packKey}`);
    process.exit(1);
  }

  const exportDir = resolve(process.cwd(), ".generated", "exports");
  await mkdir(exportDir, { recursive: true });
  const filePath = resolve(exportDir, `${pack.key}.json`);
  await writeFile(filePath, JSON.stringify(pack, null, 2));
  console.log(`Exported: ${filePath}`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
