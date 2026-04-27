export function getAddressTemplate(countryIso2: string) {
  const templates: Record<string, Record<string, unknown>> = {
    NL: {
      required_fields: ["street", "house_number", "postal_code", "city", "country"],
      field_order: ["street", "house_number", "postal_code", "city", "country"],
      postal_code_position: "before_city",
      region_required: false,
    },
  };
  return templates[countryIso2.toUpperCase()] ?? null;
}
