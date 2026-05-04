/**
 * Compare merged full-v1 pack definitions to crosswalk rows we ingest,
 * and print missing from/to value keys (same logic as ingestCrosswalksFromSeed skips).
 *
 * Usage: npx tsx ./scripts/diagnose-crosswalk-gaps.ts
 */
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { seedCrosswalks } from "../src/data/seed-crosswalks";
import { buildCountryStandardsCrosswalksFromPacks } from "../src/lib/ingestion/build-country-standards-crosswalks";
import { mergePacks } from "../src/lib/ingestion/ingest-seed-bundle";
import { buildFullV1Packs } from "./sources/index";

function valueKeyIndex(packs: ReturnType<typeof mergePacks>): Map<string, Set<string>> {
  const byFieldTypeKey = new Map<string, Set<string>>();
  for (const pack of packs.values()) {
    for (const ft of pack.fieldTypes) {
      let set = byFieldTypeKey.get(ft.key);
      if (!set) {
        set = new Set();
        byFieldTypeKey.set(ft.key, set);
      }
      for (const v of ft.values) set.add(v.key);
    }
  }
  return byFieldTypeKey;
}

async function main() {
  const packs = await buildFullV1Packs();
  const merged = mergePacks(packs);
  const index = valueKeyIndex(merged);
  const dynamic = buildCountryStandardsCrosswalksFromPacks(packs);
  const all = [...seedCrosswalks, ...dynamic];

  const missingFrom: typeof all = [];
  const missingTo: typeof all = [];
  for (const cw of all) {
    const fromOk = index.get(cw.fromFieldTypeKey)?.has(cw.fromValueKey) ?? false;
    const toOk = index.get(cw.toFieldTypeKey)?.has(cw.toValueKey) ?? false;
    if (!fromOk) missingFrom.push(cw);
    if (!toOk) missingTo.push(cw);
  }

  const lines: string[] = [];
  const log = (s: string) => {
    lines.push(s);
    console.log(s);
  };

  log(`Total crosswalk rows: ${all.length} (seed=${seedCrosswalks.length}, dynamic=${dynamic.length})`);
  log(`Missing FROM value: ${missingFrom.length}`);
  log(`Missing TO value: ${missingTo.length}`);

  if (missingFrom.length) {
    log("\n--- Sample missing FROM (first 30) ---");
    for (const row of missingFrom.slice(0, 30)) {
      log(JSON.stringify(row));
    }
  }

  const byTarget = new Map<string, number>();
  for (const row of missingTo) {
    const k = `${row.toFieldTypeKey}\t${row.toValueKey}`;
    byTarget.set(k, (byTarget.get(k) ?? 0) + 1);
  }
  const sorted = [...byTarget.entries()].sort((a, b) => b[1] - a[1]);

  if (missingTo.length) {
    log("\n--- Missing TO (count, field_type_key, value_key) ---");
    for (const [key, count] of sorted) {
      const [ft, vk] = key.split("\t");
      log(`${count}\t${ft}\t${vk}`);
    }
  }

  const outPath = resolve(process.cwd(), ".generated", "crosswalk-gap-report.txt");
  await writeFile(outPath, lines.join("\n"), "utf8");
  log(`\nWrote ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
