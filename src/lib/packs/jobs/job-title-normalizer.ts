import { normalizeOne } from "@/lib/matching/normalize-service";

export async function normalizeJobTitle(input: string) {
  return normalizeOne({ field_key: "normalized_job_titles", value: input });
}
