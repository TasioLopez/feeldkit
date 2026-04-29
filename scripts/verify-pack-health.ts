import { createClient } from "@supabase/supabase-js";

const MIN_THRESHOLDS: Record<string, number> = {
  geo: 200,
  standards: 200,
  industry: 30,
  jobs: 80,
};

const FIELD_TYPE_MINIMUMS: Record<string, number> = {
  practical_industry: 200,
  job_functions: 20,
  seniority_bands: 10,
  years_of_experience: 5,
  year_in_current_company: 5,
  year_in_current_position: 5,
  normalized_job_titles: 20,
};

const INDUSTRY_SYSTEM_MINIMUMS: Record<string, number> = {
  linkedin: 150,
  naics: 80,
  nace: 10,
  isic: 10,
  sic: 10,
  gics: 10,
  practical: 4,
};

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

  let failed = false;
  for (const [packKey, minimum] of Object.entries(MIN_THRESHOLDS)) {
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
      const key = type?.key as string | undefined;
      if (!key || !FIELD_TYPE_MINIMUMS[key]) {
        continue;
      }
      const { count } = await admin.from("field_values").select("id", { head: true, count: "exact" }).eq("field_type_id", typeId);
      const min = FIELD_TYPE_MINIMUMS[key];
      const typeOk = (count ?? 0) >= min;
      console.log(`  ${typeOk ? "[OK]" : "[LOW]"} ${key} values=${count ?? 0} minimum=${min}`);
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

  if (failed) {
    process.exit(1);
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
