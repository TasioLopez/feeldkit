import { normalizeOne } from "@/lib/matching/normalize-service";

export async function normalizeRevenueBand(input: string) {
  return normalizeOne({ field_key: "revenue_bands", value: input });
}
