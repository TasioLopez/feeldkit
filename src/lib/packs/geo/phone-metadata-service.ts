export function getPhoneMetadataByCountry(countryIso2: string) {
  const map: Record<string, { e164_prefix: string; national_number_length: number[] }> = {
    NL: { e164_prefix: "+31", national_number_length: [9] },
    CA: { e164_prefix: "+1", national_number_length: [10] },
  };
  return map[countryIso2.toUpperCase()] ?? null;
}
