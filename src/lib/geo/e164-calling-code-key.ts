/** Map ITU/dataset dial string (e.g. `32`, `1`, `1-242`) to `e164_country_calling_codes` value key. */
export function callingCodeValueKeyFromDial(dial: string): string {
  const normalized = dial.trim().replace(/[^0-9-]/g, "");
  return `e164_${normalized.replace(/-/g, "_")}`;
}
