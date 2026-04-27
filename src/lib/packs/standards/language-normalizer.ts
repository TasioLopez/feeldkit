import { normalizeOne } from "@/lib/matching/normalize-service";

export async function normalizeLanguage(input: string) {
  return normalizeOne({ field_key: "languages", value: input });
}
