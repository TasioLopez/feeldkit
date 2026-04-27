import { normalizeOne } from "@/lib/matching/normalize-service";

export async function normalizeCountry(input: string) {
  return normalizeOne({ field_key: "countries", value: input });
}
