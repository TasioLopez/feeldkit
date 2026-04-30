/** Stable `field_values.key` for IANA zones (matches historical seed style, e.g. `europe-amsterdam`). */
export function ianaTimezoneValueKey(iana: string): string {
  return iana.trim().toLowerCase().replace(/\//g, "-");
}
