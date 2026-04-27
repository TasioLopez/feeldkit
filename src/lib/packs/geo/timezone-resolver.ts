import { getFieldRepository } from "@/lib/repositories/get-field-repository";

export async function listTimezonesByCountry(countryIso2: string) {
  const repo = getFieldRepository();
  if (countryIso2.toUpperCase() === "NL") {
    const items = await repo.getValuesByFieldKey("timezones");
    return items.filter((entry) => entry.key === "europe-amsterdam");
  }
  return [];
}
