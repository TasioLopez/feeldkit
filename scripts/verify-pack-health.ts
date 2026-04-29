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

  if (failed) {
    process.exit(1);
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
