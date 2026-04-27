import { crosswalkLookup } from "@/lib/crosswalk/crosswalk-service";
import { normalizeJobTitle } from "@/lib/packs/jobs/job-title-normalizer";

export async function detectFunction(title: string) {
  const normalized = await normalizeJobTitle(title);
  const key = normalized.match?.key;
  if (!key) {
    return null;
  }
  const rows = await crosswalkLookup({ from: "normalized_job_titles", to: "job_functions", code: key });
  return rows[0] ?? null;
}
