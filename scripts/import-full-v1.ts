import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { ingestCrosswalksFromSeed, ingestSeedBundle, mergePacks } from "../src/lib/ingestion/ingest-seed-bundle";
import { buildCountryStandardsCrosswalksFromPacks } from "../src/lib/ingestion/build-country-standards-crosswalks";
import { seedCrosswalks } from "../src/data/seed-crosswalks";
import { FEELDKIT_CANONICAL_REF_V1 } from "../src/lib/domain/canonical-ref";
import { buildFullV1Packs } from "./sources";
import { buildIndustryConceptGraphWithDiagnostics } from "./sources/industry-concept-graph";
import {
  ingestIndustryConceptGraphWithClient,
  mirrorIndustryConceptEdgesToFieldCrosswalks,
} from "../src/lib/industry/concept-service";

type Args = { dryRun: boolean; forceSnapshots: boolean };
type SourceDiagnostic = {
  dataset: string;
  source_mode: string;
  ok: boolean;
  status: number | null;
  attempts: number;
  duration_ms: number;
  error_kind: string | null;
  error_message: string | null;
  payload_sha256: string | null;
  payload_bytes: number;
  snapshot_version: string | null;
  fallback_used: boolean;
  parsed_rows: number;
  minimum_rows: number;
  parse_ok: boolean;
  parse_error: string | null;
};
type PreflightCheck = { key: string; ok: boolean; expected: number; actual: number; reason?: string };

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
  sourceDiagnostics?: SourceDiagnostic[],
  preflightChecks?: PreflightCheck[],
) {
  const merged = mergePacks(packs);
  let fieldTypesWithCanonicalRef = 0;
  for (const pack of merged.values()) {
    for (const ft of pack.fieldTypes) {
      const ms = (ft as { metadata_schema?: Record<string, unknown> }).metadata_schema;
      if (ms?.[FEELDKIT_CANONICAL_REF_V1]) {
        fieldTypesWithCanonicalRef += 1;
      }
    }
  }
  const generatedDir = resolve(process.cwd(), ".generated");
  await mkdir(generatedDir, { recursive: true });
  const reportPath = resolve(generatedDir, "full-v1-import-report.json");
  await writeFile(
    reportPath,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        pack_count: merged.size,
        field_reference_summary: {
          field_types_with_canonical_ref: fieldTypesWithCanonicalRef,
        },
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
        source_diagnostics: sourceDiagnostics ?? [],
        preflight_checks: preflightChecks ?? [],
      },
      null,
      2,
    ),
  );
  console.log(`Report generated: ${reportPath}`);
}

const PREFLIGHT_MINIMUMS = {
  linkedin_nodes: 150,
  naics_nodes: 80,
  linkedin_naics_edges: 50,
} as const;

function evaluatePreflight(params: {
  sourceDiagnostics: SourceDiagnostic[];
  systemCounts: Record<string, number>;
  linkedinNaicsEdges: number;
}): PreflightCheck[] {
  const checks: PreflightCheck[] = [];
  const linkedinSource = params.sourceDiagnostics.find((entry) => entry.dataset === "linkedin_industry_codes_v2");
  const naicsSource = params.sourceDiagnostics.find((entry) => entry.dataset === "linkedin_industry_codes_v2_naics");
  checks.push({
    key: "linkedin_source_parse",
    ok: Boolean(linkedinSource?.parse_ok),
    expected: 1,
    actual: linkedinSource?.parse_ok ? 1 : 0,
    reason: linkedinSource?.parse_error ?? linkedinSource?.error_message ?? undefined,
  });
  checks.push({
    key: "linkedin_naics_source_parse",
    ok: Boolean(naicsSource?.parse_ok),
    expected: 1,
    actual: naicsSource?.parse_ok ? 1 : 0,
    reason: naicsSource?.parse_error ?? naicsSource?.error_message ?? undefined,
  });
  checks.push({
    key: "linkedin_nodes",
    ok: (params.systemCounts.linkedin ?? 0) >= PREFLIGHT_MINIMUMS.linkedin_nodes,
    expected: PREFLIGHT_MINIMUMS.linkedin_nodes,
    actual: params.systemCounts.linkedin ?? 0,
  });
  checks.push({
    key: "naics_nodes",
    ok: (params.systemCounts.naics ?? 0) >= PREFLIGHT_MINIMUMS.naics_nodes,
    expected: PREFLIGHT_MINIMUMS.naics_nodes,
    actual: params.systemCounts.naics ?? 0,
  });
  checks.push({
    key: "linkedin_naics_edges",
    ok: params.linkedinNaicsEdges >= PREFLIGHT_MINIMUMS.linkedin_naics_edges,
    expected: PREFLIGHT_MINIMUMS.linkedin_naics_edges,
    actual: params.linkedinNaicsEdges,
  });
  return checks;
}

async function run() {
  const args = parseArgs();
  process.env.FEELDKIT_SOURCE_FORCE_SNAPSHOTS = args.forceSnapshots ? "1" : "0";
  const packs = await buildFullV1Packs();
  const industryGraphResult = await buildIndustryConceptGraphWithDiagnostics({ forceSnapshots: args.forceSnapshots });
  const industryGraph = industryGraphResult.graph;
  const sourceDiagnostics: SourceDiagnostic[] = [
    industryGraphResult.sourceDiagnostics.linkedin,
    industryGraphResult.sourceDiagnostics.linkedin_naics,
  ].map((entry) => ({
    dataset: entry.dataset,
    source_mode: entry.fetch.source_mode,
    ok: entry.fetch.ok,
    status: entry.fetch.status,
    attempts: entry.fetch.attempts,
    duration_ms: entry.fetch.duration_ms,
    error_kind: entry.fetch.error_kind,
    error_message: entry.fetch.error_message,
    payload_sha256: entry.fetch.payload_sha256,
    payload_bytes: entry.fetch.payload_bytes,
    snapshot_version: entry.fetch.snapshot_version,
    fallback_used: entry.fallback_used,
    parsed_rows: entry.parsed_rows,
    minimum_rows: entry.minimum_rows,
    parse_ok: entry.parse_ok,
    parse_error: entry.parse_error,
  }));
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
  const preflightChecks = evaluatePreflight({
    sourceDiagnostics,
    systemCounts,
    linkedinNaicsEdges: industryGraph.edges.filter(
      (edge) => edge.fromSystem === "linkedin" && edge.toSystem === "naics" && edge.source === "linkedin_industry_codes_v2_naics",
    ).length,
  });
  const preflightFailed = preflightChecks.some((check) => !check.ok);
  const preflightSummary = {
    strict_mode: true,
    failed: preflightFailed,
    checks: preflightChecks,
  };

  if (args.dryRun) {
    await writeReport(
      packs,
      { mode: "dry-run", preflight: preflightSummary },
      {
        nodes: industryGraph.nodes.length,
        edges: industryGraph.edges.length,
        by_system: systemCounts,
        by_relation_type: relationCounts,
        linkedin_to_naics_coverage_pct: linkedInNaicsCoveragePct,
        mode: "dry-run",
      },
      sourceDiagnostics,
      preflightChecks,
    );
    if (preflightFailed) {
      throw new Error(
        `Phase 0 preflight failed: ${preflightChecks
          .filter((entry) => !entry.ok)
          .map((entry) => `${entry.key}=${entry.actual} expected>=${entry.expected}${entry.reason ? ` (${entry.reason})` : ""}`)
          .join(", ")}`,
      );
    }
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
  if (preflightFailed) {
    await writeReport(
      packs,
      { mode: "apply-blocked", preflight: preflightSummary },
      {
        nodes: industryGraph.nodes.length,
        edges: industryGraph.edges.length,
        by_system: systemCounts,
        by_relation_type: relationCounts,
        linkedin_to_naics_coverage_pct: linkedInNaicsCoveragePct,
      },
      sourceDiagnostics,
      preflightChecks,
    );
    throw new Error(
      `Phase 0 preflight failed before DB write: ${preflightChecks
        .filter((entry) => !entry.ok)
        .map((entry) => `${entry.key}=${entry.actual} expected>=${entry.expected}${entry.reason ? ` (${entry.reason})` : ""}`)
        .join(", ")}`,
    );
  }
  const conceptSummary = await ingestIndustryConceptGraphWithClient(admin, industryGraph, { strict: true });
  const summary = await ingestSeedBundle(admin, packs, {
    sourceKeyPrefix: "full-v1",
    forceVersionSnapshot: args.forceSnapshots,
  });
  const mirroredIndustryCrosswalks = await mirrorIndustryConceptEdgesToFieldCrosswalks(admin, industryGraph, { strict: true });
  const countryCrosswalkSeeds = buildCountryStandardsCrosswalksFromPacks(packs);
  const crosswalkSummary = await ingestCrosswalksFromSeed(
    admin,
    [...seedCrosswalks, ...countryCrosswalkSeeds],
    "full-v1-crosswalks",
    { strict: true },
  );
  await writeReport(
    packs,
    {
      ...summary,
      crosswalks: crosswalkSummary.inserted,
      crosswalks_integrity: crosswalkSummary,
      industry_crosswalks: mirroredIndustryCrosswalks.inserted,
      industry_crosswalks_integrity: mirroredIndustryCrosswalks,
      preflight: preflightSummary,
      mode: "apply",
    },
    {
      ...conceptSummary,
      nodes: industryGraph.nodes.length,
      edges: industryGraph.edges.length,
      by_system: systemCounts,
      by_relation_type: relationCounts,
      linkedin_to_naics_coverage_pct: linkedInNaicsCoveragePct,
    },
    sourceDiagnostics,
    preflightChecks,
  );
  console.log(
    `Full V1 import complete. packs=${summary.packs} field_types=${summary.fieldTypes} values=${summary.fieldValues} aliases=${summary.aliases} crosswalks=${crosswalkSummary.inserted} industry_crosswalks=${mirroredIndustryCrosswalks.inserted} concept_codes=${conceptSummary.codes} concept_edges=${conceptSummary.edges}`,
  );
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
