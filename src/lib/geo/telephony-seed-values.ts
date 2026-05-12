import type { SeedValue } from "@/data/packs/types";
import dialByIso2 from "@/data/packs/standards/e164-dial-by-iso2.json";
import { callingCodeValueKeyFromDial } from "@/lib/geo/e164-calling-code-key";

/** Distinct E.164-style calling prefixes for `e164_country_calling_codes` field values. */
export function buildE164CallingCodeSeedValues(): SeedValue[] {
  const uniqueDials = new Set<string>();
  for (const d of Object.values(dialByIso2 as Record<string, string>)) {
    const t = d?.trim();
    if (t) uniqueDials.add(t);
  }
  return [...uniqueDials].sort().map((dial) => {
    const key = callingCodeValueKeyFromDial(dial);
    const spaced = dial.replace(/-/g, " ");
    return {
      key,
      label: `+${spaced}`,
      aliases: [`+${dial}`, `+${dial.replace(/-/g, "")}`, dial, dial.replace(/-/g, "")],
      metadata: {
        source_standard: "itu_e164_like",
        dial_raw: dial,
      },
    };
  });
}
