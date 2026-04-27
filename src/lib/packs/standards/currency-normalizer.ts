import { normalizeOne } from "@/lib/matching/normalize-service";

export async function normalizeCurrency(input: string) {
  return normalizeOne({ field_key: "currencies", value: input });
}
