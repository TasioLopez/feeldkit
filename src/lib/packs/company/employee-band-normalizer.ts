import { normalizeOne } from "@/lib/matching/normalize-service";

export async function normalizeEmployeeBand(input: string) {
  return normalizeOne({ field_key: "employee_size_bands", value: input });
}
