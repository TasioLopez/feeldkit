import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { FEELDKIT_CANONICAL_REF_V1 } from "../src/lib/domain/canonical-ref";
import { assertPolicyConsistency } from "../src/lib/matching/inference/policy";
import { runInference } from "../src/lib/matching/inference/engine";
import { getFieldRepository } from "../src/lib/repositories/get-field-repository";

const MIN_PACK_VALUE_COUNTS: Record<string, number> = {
  geo: 200,
  standards_currencies: 40,
  standards_languages: 15,
  standards_timezones: 80,
  industry: 30,
  jobs: 80,
  company: 1,
};

const FIELD_TYPE_MINIMUMS: Record<string, number> = {
  practical_industry: 200,
  linkedin_industry_codes: 150,
  naics_codes: 80,
  job_functions: 20,
  seniority_bands: 10,
  years_of_experience: 5,
  year_in_current_company: 5,
  year_in_current_position: 5,
  normalized_job_titles: 20,
  company_headcounts: 5,
  currencies: 30,
  languages: 15,
  timezones: 80,
};

const INDUSTRY_SYSTEM_MINIMUMS: Record<string, number> = {
  linkedin: 150,
  naics: 80,
  nace: 10,
  isic: 10,
  sic: 8,
  gics: 10,
  practical: 4,
};

const REPORT_PATH = resolve(process.cwd(), ".generated", "full-v1-import-report.json");

const CONSUMER_FIELDS_WITH_REF = ["company_industry", "company_country", "company_employee_size_band"] as const;

const CROSSWALK_FLOORS: Array<{ type: string; minimum: number }> = [
  { type: "country_default_currency", minimum: 120 },
  { type: "country_official_language", minimum: 120 },
  { type: "country_default_timezone", minimum: 120 },
];

type ImportReport = {
  source_diagnostics?: Array<{
    dataset: string;
    parse_ok: boolean;
    parsed_rows: number;
    minimum_rows: number;
  }>;
  preflight_checks?: Array<{
    key: string;
    ok: boolean;
    expected: number;
    actual: number;
  }>;
  field_reference_summary?: { field_types_with_canonical_ref?: number };
};

type PrecisionReport = {
  generated_at: string;
  fixtures: Array<{ fixture: string; domain: string; pass_rate: number; total: number; passed: number }>;
  baselines: Record<string, number>;
  default_baseline: number;
};

type FlowsPrecisionReport = {
  generated_at: string;
  fixtures: Array<{ fixture: string; flow_key: string; pass_rate: number; total: number; passed: number }>;
  baselines: Record<string, number>;
  default_baseline: number;
};

const PRECISION_REPORT_PATH = resolve(process.cwd(), ".generated", "inference-precision-report.json");
const FLOWS_PRECISION_REPORT_PATH = resolve(process.cwd(), ".generated", "flows-precision-report.json");

async function loadPrecisionReport(): Promise<PrecisionReport | null> {
  try {
    const content = await readFile(PRECISION_REPORT_PATH, "utf8");
    return JSON.parse(content) as PrecisionReport;
  } catch {
    return null;
  }
}

async function loadFlowsPrecisionReport(): Promise<FlowsPrecisionReport | null> {
  try {
    const content = await readFile(FLOWS_PRECISION_REPORT_PATH, "utf8");
    return JSON.parse(content) as FlowsPrecisionReport;
  } catch {
    return null;
  }
}

async function loadImportReport(): Promise<ImportReport | null> {
  try {
    const content = await readFile(REPORT_PATH, "utf8");
    return JSON.parse(content) as ImportReport;
  } catch {
    return null;
  }
}

async function run() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }
  const admin = createClient(url, key);
  const { data: packs, error: packErr } = await admin.from("field_packs").select("id,key,name");
  if (packErr || !packs) {
    throw new Error(`Unable to load packs: ${packErr?.message ?? "unknown error"}`);
  }
  const report = await loadImportReport();

  let failed = false;
  for (const [packKey, minimum] of Object.entries(MIN_PACK_VALUE_COUNTS)) {
    const pack = packs.find((entry) => entry.key === packKey);
    if (!pack) {
      console.log(`[MISSING] ${packKey} pack not found`);
      failed = true;
      continue;
    }
    const { data: types } = await admin.from("field_types").select("id").eq("field_pack_id", pack.id);
    const typeIds = (types ?? []).map((entry) => entry.id);
    let total = 0;
    for (const typeId of typeIds) {
      const { count } = await admin.from("field_values").select("id", { head: true, count: "exact" }).eq("field_type_id", typeId);
      total += count ?? 0;
    }
    const ok = total >= minimum;
    console.log(`${ok ? "[OK]" : "[LOW]"} ${packKey} values=${total} minimum=${minimum}`);
    if (!ok) failed = true;

    for (const typeId of typeIds) {
      const { data: type } = await admin.from("field_types").select("key").eq("id", typeId).maybeSingle();
      const k = type?.key as string | undefined;
      if (!k || !FIELD_TYPE_MINIMUMS[k]) {
        continue;
      }
      const { count } = await admin.from("field_values").select("id", { head: true, count: "exact" }).eq("field_type_id", typeId);
      const min = FIELD_TYPE_MINIMUMS[k];
      const typeOk = (count ?? 0) >= min;
      console.log(`  ${typeOk ? "[OK]" : "[LOW]"} ${k} values=${count ?? 0} minimum=${min}`);
      if (!typeOk) failed = true;
    }
  }

  const { data: conceptCodes } = await admin.from("industry_concept_codes").select("code_system");
  const bySystem = new Map<string, number>();
  for (const row of conceptCodes ?? []) {
    const system = String(row.code_system);
    bySystem.set(system, (bySystem.get(system) ?? 0) + 1);
  }
  for (const [system, minimum] of Object.entries(INDUSTRY_SYSTEM_MINIMUMS)) {
    const count = bySystem.get(system) ?? 0;
    const ok = count >= minimum;
    console.log(`${ok ? "[OK]" : "[LOW]"} industry_system=${system} values=${count} minimum=${minimum}`);
    if (!ok) failed = true;
  }

  const { data: liNaicsEdges } = await admin
    .from("industry_concept_edges")
    .select("id")
    .eq("relation_type", "equivalent_to")
    .eq("source", "linkedin_industry_codes_v2_naics");
  const liNaicsEdgeCount = (liNaicsEdges ?? []).length;
  const liNaicsOk = liNaicsEdgeCount >= 50;
  console.log(`${liNaicsOk ? "[OK]" : "[LOW]"} linkedin_naics_edges=${liNaicsEdgeCount} minimum=50`);
  if (!liNaicsOk) failed = true;

  for (const { type: cwType, minimum } of CROSSWALK_FLOORS) {
    const { count } = await admin.from("field_crosswalks").select("id", { head: true, count: "exact" }).eq("crosswalk_type", cwType);
    const n = count ?? 0;
    const ok = n >= minimum;
    console.log(`${ok ? "[OK]" : "[LOW]"} crosswalk_type=${cwType} count=${n} minimum=${minimum}`);
    if (!ok) failed = true;
  }

  const { data: langType } = await admin.from("field_types").select("id").eq("key", "languages").maybeSingle();
  if (langType?.id) {
    const { count: aliasCount } = await admin
      .from("field_aliases")
      .select("id", { head: true, count: "exact" })
      .eq("field_type_id", langType.id);
    const ac = aliasCount ?? 0;
    const aliasOk = ac >= 40;
    console.log(`${aliasOk ? "[OK]" : "[LOW]"} language_aliases=${ac} minimum=40`);
    if (!aliasOk) failed = true;
  }

  for (const fieldKey of CONSUMER_FIELDS_WITH_REF) {
    const { data: row } = await admin.from("field_types").select("metadata_schema").eq("key", fieldKey).maybeSingle();
    const ref = (row?.metadata_schema as Record<string, unknown> | null)?.[FEELDKIT_CANONICAL_REF_V1];
    const ok = Boolean(ref);
    console.log(`${ok ? "[OK]" : "[LOW]"} canonical_ref field_type=${fieldKey}`);
    if (!ok) failed = true;
    if (ref && typeof ref === "object" && "field_type_key" in ref) {
      const fk = String((ref as { field_type_key: string }).field_type_key);
      const { data: target } = await admin.from("field_types").select("id").eq("key", fk).maybeSingle();
      const targetOk = Boolean(target?.id);
      console.log(`  ${targetOk ? "[OK]" : "[LOW]"} ref_target_exists ${fk}`);
      if (!targetOk) failed = true;
    }
  }

  const policyResult = assertPolicyConsistency();
  console.log(`${policyResult.ok ? "[OK]" : "[LOW]"} inference_policy_thresholds_consistent`);
  for (const problem of policyResult.problems) {
    console.log(`  [LOW] policy_problem ${problem}`);
  }
  if (!policyResult.ok) failed = true;

  try {
    const repo = getFieldRepository();
    const inference = await runInference({ fieldKey: "countries", value: "NL" }, repo);
    const explainOk = inference.explain?.version === "1";
    console.log(`${explainOk ? "[OK]" : "[LOW]"} inference_engine_explain_present version=${inference.explain?.version ?? "missing"}`);
    if (!explainOk) failed = true;
  } catch (error) {
    console.log(`[LOW] inference_engine_explain_present error=${(error as Error).message}`);
    failed = true;
  }

  const precisionReport = await loadPrecisionReport();
  if (!precisionReport) {
    console.log("[WARN] inference precision report not found; run `npm run inference:precision`");
  } else {
    for (const fixture of precisionReport.fixtures) {
      const baseline = precisionReport.baselines[fixture.domain] ?? precisionReport.default_baseline;
      const ok = fixture.pass_rate >= baseline;
      console.log(
        `${ok ? "[OK]" : "[LOW]"} inference_precision fixture=${fixture.fixture} domain=${fixture.domain} pass_rate=${fixture.pass_rate.toFixed(2)} baseline=${baseline.toFixed(2)} (${fixture.passed}/${fixture.total})`,
      );
      if (!ok) failed = true;
    }
  }

  // Phase 3 — flow packs gates
  const { data: flowPackRows } = await admin.from("flow_packs").select("id,key,name,status");
  const flagshipKey = "linkedin_salesnav__hubspot";
  const flagship = (flowPackRows ?? []).find((row) => row.key === flagshipKey && row.status === "active");
  const flowPacksOk = Boolean(flagship);
  console.log(`${flowPacksOk ? "[OK]" : "[LOW]"} flow_packs_present flagship=${flagshipKey} (${flowPackRows?.length ?? 0} active flows)`);
  if (!flowPacksOk) failed = true;

  if (flagship?.id) {
    const { data: activeVersion } = await admin
      .from("flow_pack_versions")
      .select("id,version,is_active")
      .eq("flow_pack_id", flagship.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!activeVersion?.id) {
      console.log(`[LOW] flow_packs_active_version flow=${flagshipKey} (no active version)`);
      failed = true;
    } else {
      const { data: mappings } = await admin
        .from("flow_pack_field_mappings")
        .select("kind,source_field_key,target_field_key,is_required")
        .eq("flow_pack_version_id", activeVersion.id);
      const allKeys = new Set<string>();
      for (const mapping of mappings ?? []) {
        allKeys.add(String(mapping.source_field_key));
        allKeys.add(String(mapping.target_field_key));
      }
      let resolvableMisses = 0;
      for (const fieldKey of allKeys) {
        // direct mappings can use HubSpot-side keys that have no field_types row yet (e.g. firstname),
        // so a miss is only a hard failure when the mapping kind is `translate` for either side.
        const { data: type } = await admin.from("field_types").select("id").eq("key", fieldKey).maybeSingle();
        if (type?.id) continue;
        const usedAsTranslate = (mappings ?? []).some(
          (mapping) =>
            mapping.kind === "translate" &&
            (mapping.source_field_key === fieldKey || mapping.target_field_key === fieldKey),
        );
        if (usedAsTranslate) {
          resolvableMisses += 1;
          console.log(`  [LOW] flow_field_mapping_unresolvable field_key=${fieldKey} (translate kind)`);
        }
      }
      const resolvableOk = resolvableMisses === 0;
      console.log(
        `${resolvableOk ? "[OK]" : "[LOW]"} flow_field_mappings_resolvable flow=${flagshipKey} version=${activeVersion.version}`,
      );
      if (!resolvableOk) failed = true;
    }
  }

  const flowsPrecisionReport = await loadFlowsPrecisionReport();
  if (!flowsPrecisionReport) {
    console.log("[WARN] flow precision report not found; run `npm run flows:precision`");
  } else {
    for (const fixture of flowsPrecisionReport.fixtures) {
      const baseline = flowsPrecisionReport.baselines[fixture.flow_key] ?? flowsPrecisionReport.default_baseline;
      const ok = fixture.pass_rate >= baseline;
      console.log(
        `${ok ? "[OK]" : "[LOW]"} flow_translate_deterministic_baseline fixture=${fixture.fixture} flow=${fixture.flow_key} pass_rate=${fixture.pass_rate.toFixed(2)} baseline=${baseline.toFixed(2)} (${fixture.passed}/${fixture.total})`,
      );
      if (!ok) failed = true;
    }
  }

  if (!report) {
    console.log("[WARN] import report not found; skipping consistency checks against .generated/full-v1-import-report.json");
  } else {
    for (const diagnostic of report.source_diagnostics ?? []) {
      const parseOk = Boolean(diagnostic.parse_ok);
      console.log(`${parseOk ? "[OK]" : "[LOW]"} source_parse=${diagnostic.dataset} rows=${diagnostic.parsed_rows} minimum=${diagnostic.minimum_rows}`);
      if (!parseOk) failed = true;
    }
    for (const check of report.preflight_checks ?? []) {
      const ok = Boolean(check.ok);
      console.log(`${ok ? "[OK]" : "[LOW]"} report_preflight=${check.key} actual=${check.actual} minimum=${check.expected}`);
      if (!ok) failed = true;
    }
    const expectedRefs = report.field_reference_summary?.field_types_with_canonical_ref ?? 0;
    if (expectedRefs > 0) {
      const refOk = expectedRefs >= 3;
      console.log(`${refOk ? "[OK]" : "[LOW]"} import_report field_types_with_canonical_ref=${expectedRefs} (expected>=3)`);
      if (!refOk) failed = true;
    }
  }

  if (failed) {
    process.exit(1);
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
