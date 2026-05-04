/**
 * Ingest flow pack JSON files (`src/data/flows/*.flow.json`) into Supabase.
 *
 * Usage:
 *   npm run flows:ingest
 *
 * - Validates each definition against `feeldkit.flow_pack.v1`.
 * - Upserts `flow_packs` rows by `key`.
 * - Inserts a new `flow_pack_versions` row when the (flow_pack_id, version) tuple is absent;
 *   marks it `is_active = true` and demotes other versions of the same flow.
 * - Replaces denormalized `flow_pack_field_mappings` rows for the version (idempotent).
 * - Writes `.generated/flows-ingest-report.json` with counts + deterministic coverage stats.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { flowDefinitions } from "../src/data/flows";
import { flowPackV1Schema, type FlowPackV1 } from "../src/lib/flows/schema";

// Supabase generic types are strict at the script level; we operate via the service role
// against tables that aren't in the generated `Database` type yet, so we deliberately use
// the default loose client (matches `scripts/seed.ts` / `scripts/import-pack.ts`).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = ReturnType<typeof createClient<any, any, any>>;

type FlowIngestResult = {
  key: string;
  version: string;
  flow_pack_id: string;
  flow_pack_version_id: string;
  status: "created" | "updated" | "skipped";
  field_mappings: number;
  translate_mappings: number;
  direct_mappings: number;
};

type ReportShape = {
  generated_at: string;
  flows: FlowIngestResult[];
};

const REPORT_PATH = resolve(process.cwd(), ".generated", "flows-ingest-report.json");

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("[FAIL] NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
    process.exit(1);
  }
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  const validated: FlowPackV1[] = flowDefinitions.map((raw) => flowPackV1Schema.parse(raw));
  const results: FlowIngestResult[] = [];

  for (const definition of validated) {
    const result = await ingestOne(admin, definition);
    results.push(result);
    console.log(
      `[${result.status.toUpperCase()}] ${result.key}@${result.version} ` +
        `(${result.field_mappings} mappings: ${result.direct_mappings} direct, ${result.translate_mappings} translate)`,
    );
  }

  await mkdir(resolve(process.cwd(), ".generated"), { recursive: true });
  const report: ReportShape = { generated_at: new Date().toISOString(), flows: results };
  await writeFile(REPORT_PATH, JSON.stringify(report, null, 2), "utf8");
  console.log(`[INFO] report written to ${REPORT_PATH}`);
}

async function ingestOne(admin: AdminClient, definition: FlowPackV1): Promise<FlowIngestResult> {
  const directMappings = definition.field_mappings.filter((m) => m.kind === "direct").length;
  const translateMappings = definition.field_mappings.filter((m) => m.kind === "translate").length;

  const { data: existingPack, error: lookupError } = await admin
    .from("flow_packs")
    .select("id")
    .eq("key", definition.key)
    .maybeSingle();
  if (lookupError) {
    throw new Error(`flow_packs lookup failed for ${definition.key}: ${lookupError.message}`);
  }

  let packId: string;
  if (existingPack) {
    packId = existingPack.id as string;
    const { error: updateError } = await admin
      .from("flow_packs")
      .update({
        name: definition.name,
        description: definition.description ?? "",
        source_system: definition.source_system,
        target_system: definition.target_system,
        metadata: definition.metadata ?? {},
        updated_at: new Date().toISOString(),
      })
      .eq("id", packId);
    if (updateError) {
      throw new Error(`flow_packs update failed for ${definition.key}: ${updateError.message}`);
    }
  } else {
    const { data: insertedPack, error: insertError } = await admin
      .from("flow_packs")
      .insert({
        key: definition.key,
        name: definition.name,
        description: definition.description ?? "",
        source_system: definition.source_system,
        target_system: definition.target_system,
        metadata: definition.metadata ?? {},
      })
      .select("id")
      .single();
    if (insertError || !insertedPack) {
      throw new Error(`flow_packs insert failed for ${definition.key}: ${insertError?.message}`);
    }
    packId = insertedPack.id as string;
  }

  const { data: existingVersion, error: versionLookupError } = await admin
    .from("flow_pack_versions")
    .select("id")
    .eq("flow_pack_id", packId)
    .eq("version", definition.version)
    .maybeSingle();
  if (versionLookupError) {
    throw new Error(`flow_pack_versions lookup failed: ${versionLookupError.message}`);
  }

  let versionId: string;
  let status: FlowIngestResult["status"];
  if (existingVersion) {
    versionId = existingVersion.id as string;
    const { error: versionUpdateError } = await admin
      .from("flow_pack_versions")
      .update({
        changelog: definition.changelog ?? null,
        definition: definition as unknown as Record<string, unknown>,
        is_active: true,
      })
      .eq("id", versionId);
    if (versionUpdateError) {
      throw new Error(`flow_pack_versions update failed: ${versionUpdateError.message}`);
    }
    status = "updated";
  } else {
    const { data: insertedVersion, error: versionInsertError } = await admin
      .from("flow_pack_versions")
      .insert({
        flow_pack_id: packId,
        version: definition.version,
        changelog: definition.changelog ?? null,
        definition: definition as unknown as Record<string, unknown>,
        is_active: true,
      })
      .select("id")
      .single();
    if (versionInsertError || !insertedVersion) {
      throw new Error(`flow_pack_versions insert failed: ${versionInsertError?.message}`);
    }
    versionId = insertedVersion.id as string;
    status = "created";
  }

  // Demote other versions of the same flow.
  const { error: demoteError } = await admin
    .from("flow_pack_versions")
    .update({ is_active: false })
    .eq("flow_pack_id", packId)
    .neq("id", versionId);
  if (demoteError) {
    throw new Error(`flow_pack_versions demote failed: ${demoteError.message}`);
  }

  // Replace denormalized mapping rows.
  const { error: deleteError } = await admin
    .from("flow_pack_field_mappings")
    .delete()
    .eq("flow_pack_version_id", versionId);
  if (deleteError) {
    throw new Error(`flow_pack_field_mappings delete failed: ${deleteError.message}`);
  }

  const mappingRows = definition.field_mappings.map((mapping, idx) => ({
    flow_pack_version_id: versionId,
    ordinal: idx,
    kind: mapping.kind,
    source_field_key: mapping.source_field_key,
    target_field_key: mapping.target_field_key,
    transform: mapping.kind === "direct" ? mapping.transform ?? { op: "copy" } : {},
    options: mapping.kind === "translate" ? mapping.options ?? {} : {},
    is_required: mapping.is_required,
  }));
  const { error: insertMappingsError } = await admin
    .from("flow_pack_field_mappings")
    .insert(mappingRows);
  if (insertMappingsError) {
    throw new Error(`flow_pack_field_mappings insert failed: ${insertMappingsError.message}`);
  }

  return {
    key: definition.key,
    version: definition.version,
    flow_pack_id: packId,
    flow_pack_version_id: versionId,
    status,
    field_mappings: definition.field_mappings.length,
    translate_mappings: translateMappings,
    direct_mappings: directMappings,
  };
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
