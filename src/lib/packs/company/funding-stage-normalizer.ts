import { normalizeOne } from "@/lib/matching/normalize-service";

export async function normalizeFundingStage(input: string) {
  return normalizeOne({ field_key: "funding_stages", value: input });
}
