import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { ingestCrosswalksFromSeed, ingestSeedBundle, mergePacks } from "../src/lib/ingestion/ingest-seed-bundle";
import { seedCrosswalks } from "../src/data/seed-crosswalks";
import { buildFullV1Packs } from "./sources";
import { buildIndustryConceptGraph } from "./sources/industry-concept-graph";
import {
  ingestIndustryConceptGraphWithClient,
  mirrorIndustryConceptEdgesToFieldCrosswalks,
} from "../src/lib/industry/concept-service";

type Args = { dryRun: boolean; forceSnapshots: boolean };

function parseArgs(): Args {
  const args = new Set(process.argv.slice(2));
  return {
    dryRun: args.has("--dry-run"),
    forceSnapshots: args.has("--force-snapshots"),
  };
}

async function writeReport(
  packs: Awaited<ReturnType<typeof buildFullV1Packs>>,
  summary?: Record<string, unknown>,
  conceptSummary?: Record<string, unknown>,
) {
  const merged = mergePacks(packs);
  const generatedDir = resolve(process.cwd(), ".generated");
  await mkdir(generatedDir, { recursive: true });
  const reportPath = resolve(generatedDir, "full-v1-import-report.json");
  await writeFile(
    reportPath,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        pack_count: merged.size,
        packs: [...merged.values()].map((pack) => ({
          key: pack.key,
          name: pack.name,
          version: pack.version,
          source: pack.source,
          field_type_count: pack.fieldTypes.length,
          value_count: pack.fieldTypes.reduce((acc, entry) => acc + entry.values.length, 0),
          field_types: pack.fieldTypes.map((fieldType) => ({
            key: fieldType.key,
            name: fieldType.name,
            value_count: fieldType.values.length,
            standard_values: fieldType.values.filter((value) => Boolean(value.metadata?.source_standard)).length,
            overlay_values: fieldType.values.filter((value) => Boolean(value.metadata?.source_overlay)).length,
          })),
        })),
        summary: summary ?? null,
        industry_concept_summary: conceptSummary ?? null,
      },
      null,
      2,
    ),
  );
  console.log(`Report generated: ${reportPath}`);
}

async function run() {
  const args = parseArgs();
  const packs = await buildFullV1Packs();
  const industryGraph = await buildIndustryConceptGraph();
  const systemCounts = industryGraph.nodes.reduce<Record<string, number>>((acc, node) => {
    acc[node.codeSystem] = (acc[node.codeSystem] ?? 0) + 1;
    return acc;
  }, {});
  const relationCounts = industryGraph.edges.reduce<Record<string, number>>((acc, edge) => {
    acc[edge.relationType] = (acc[edge.relationType] ?? 0) + 1;
    return acc;
  }, {});
  const linkedinCodes = systemCounts.linkedin ?? 0;
  const linkedinMappedToNaics = new Set(
    industryGraph.edges
      .filter((edge) => edge.fromSystem === "linkedin" && edge.toSystem === "naics")
      .map((edge) => edge.fromCode),
  ).size;
  const linkedInNaicsCoveragePct = linkedinCodes === 0 ? 0 : Math.round((linkedinMappedToNaics / linkedinCodes) * 10000) / 100;

  if (args.dryRun) {
    await writeReport(
      packs,
      { mode: "dry-run" },
      {
        nodes: industryGraph.nodes.length,
        edges: industryGraph.edges.length,
        by_system: systemCounts,
        by_relation_type: relationCounts,
        linkedin_to_naics_coverage_pct: linkedInNaicsCoveragePct,
        mode: "dry-run",
      },
    );
    console.log("Dry run complete. No DB writes performed.");
    return;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }
  const admin = createClient(url, key);
  const conceptSummary = await ingestIndustryConceptGraphWithClient(admin, industryGraph);
  const mirroredIndustryCrosswalks = await mirrorIndustryConceptEdgesToFieldCrosswalks(admin, industryGraph);
  const summary = await ingestSeedBundle(admin, packs, {
    sourceKeyPrefix: "full-v1",
    forceVersionSnapshot: args.forceSnapshots,
  });
  const crosswalkCount = await ingestCrosswalksFromSeed(admin, seedCrosswalks, "full-v1-crosswalks");
  await writeReport(
    packs,
    { ...summary, crosswalks: crosswalkCount, industry_crosswalks: mirroredIndustryCrosswalks, mode: "apply" },
    {
      ...conceptSummary,
      nodes: industryGraph.nodes.length,
      edges: industryGraph.edges.length,
      by_system: systemCounts,
      by_relation_type: relationCounts,
      linkedin_to_naics_coverage_pct: linkedInNaicsCoveragePct,
    },
  );
  console.log(
    `Full V1 import complete. packs=${summary.packs} field_types=${summary.fieldTypes} values=${summary.fieldValues} aliases=${summary.aliases} crosswalks=${crosswalkCount} industry_crosswalks=${mirroredIndustryCrosswalks} concept_codes=${conceptSummary.codes} concept_edges=${conceptSummary.edges}`,
  );
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
