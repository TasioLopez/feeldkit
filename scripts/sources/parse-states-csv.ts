import type { SeedValue } from "../../src/data/packs/types";

/** Parse dr5hn countries-states-cities `states.csv` (header row required). */
export function parseStatesCsvToSubdivisionSeeds(csvText: string): SeedValue[] {
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];
  const header = lines[0].split(",");
  const idx = {
    name: header.indexOf("name"),
    country_code: header.indexOf("country_code"),
    iso3166_2: header.indexOf("iso3166_2"),
    native: header.indexOf("native"),
  };
  if (idx.name < 0 || idx.country_code < 0 || idx.iso3166_2 < 0) {
    throw new Error("states.csv: missing required columns name,country_code,iso3166_2");
  }
  const out: SeedValue[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cols = splitCsvLine(lines[i]);
    const name = cols[idx.name]?.trim();
    const countryIso2 = cols[idx.country_code]?.trim().toUpperCase();
    const iso3166_2 = cols[idx.iso3166_2]?.trim().toUpperCase();
    if (!name || !countryIso2 || !iso3166_2 || !iso3166_2.includes("-")) continue;
    const native = idx.native >= 0 ? cols[idx.native]?.trim() : "";
    const key = iso3166_2.toLowerCase().replace(/-/g, "_");
    const aliases = [iso3166_2, `${countryIso2}-${iso3166_2.split("-")[1]}`].filter(Boolean);
    if (native && native !== name) aliases.push(native);
    out.push({
      key,
      label: name,
      aliases: [...new Set(aliases)],
      metadata: {
        source_standard: "iso3166_2",
        country_iso2: countryIso2,
        iso3166_2: iso3166_2,
        ...(native ? { native_name: native } : {}),
      },
    });
  }
  return out;
}

/** Minimal CSV splitter — fields are unquoted in dr5hn states.csv except occasional quoted native names. */
function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (c === "," && !inQuotes) {
      result.push(cur);
      cur = "";
      continue;
    }
    cur += c;
  }
  result.push(cur);
  return result;
}
