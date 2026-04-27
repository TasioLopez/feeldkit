import { normalizeOne } from "@/lib/matching/normalize-service";

export async function normalizeTechnology(input: string) {
  return normalizeOne({ field_key: "technology_vendors", value: input });
}
