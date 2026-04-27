import { normalizeOne } from "@/lib/matching/normalize-service";

export async function normalizeSubdivision(input: string, country?: string) {
  return normalizeOne({
    field_key: "subdivisions",
    value: input,
    context: country ? { country } : undefined,
  });
}
