import { normalizeOne } from "@/lib/matching/normalize-service";

export async function normalizeIndustry(input: string) {
  return normalizeOne({ field_key: "practical_industry", value: input });
}
