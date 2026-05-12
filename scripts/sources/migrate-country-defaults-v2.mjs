/**
 * Migrates legacy flat country-iso2-defaults.json to version 2 (languages[] / timezones[]).
 * Usage: node scripts/sources/migrate-country-defaults-v2.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(__dirname, "..", "..");
const srcPath = resolve(root, "src", "data", "country-iso2-defaults.json");

const raw = JSON.parse(readFileSync(srcPath, "utf8"));

let countries;
if (raw.version === 2 && raw.countries) {
  console.log("already v2");
  process.exit(0);
} else {
  countries = {};
  for (const [iso2, row] of Object.entries(raw)) {
    const r = row;
    if (typeof r !== "object" || r === null) continue;
    const cur = r.currency ?? null;
    const lang3 = r.language_iso639_3 ?? null;
    const tz = r.timezone ?? null;
    countries[iso2] = {
      currency: cur,
      languages: lang3 ? [{ iso639_3: lang3, primary: true }] : [],
      timezones: tz ? [{ iana: tz, primary: true }] : [],
    };
  }
}

const multi = {
  BE: {
    languages: [
      { iso639_3: "nld", primary: true },
      { iso639_3: "fra", primary: false },
      { iso639_3: "deu", primary: false },
    ],
    timezones: [{ iana: "Europe/Brussels", primary: true }],
  },
  CH: {
    languages: [
      { iso639_3: "deu", primary: true },
      { iso639_3: "fra", primary: false },
      { iso639_3: "ita", primary: false },
      { iso639_3: "roh", primary: false },
    ],
    timezones: [{ iana: "Europe/Zurich", primary: true }],
  },
  CA: {
    languages: [
      { iso639_3: "eng", primary: true },
      { iso639_3: "fra", primary: false },
    ],
    timezones: [
      { iana: "America/Toronto", primary: true },
      { iana: "America/Vancouver", primary: false },
      { iana: "America/Edmonton", primary: false },
      { iana: "America/Winnipeg", primary: false },
      { iana: "America/Halifax", primary: false },
      { iana: "America/St_Johns", primary: false },
    ],
  },
  US: {
    languages: [
      { iso639_3: "eng", primary: true },
      { iso639_3: "spa", primary: false },
    ],
    timezones: [
      { iana: "America/New_York", primary: true },
      { iana: "America/Chicago", primary: false },
      { iana: "America/Denver", primary: false },
      { iana: "America/Los_Angeles", primary: false },
      { iana: "America/Anchorage", primary: false },
      { iana: "Pacific/Honolulu", primary: false },
    ],
  },
  RU: {
    languages: [{ iso639_3: "rus", primary: true }],
    timezones: [
      { iana: "Europe/Moscow", primary: true },
      { iana: "Asia/Yekaterinburg", primary: false },
      { iana: "Asia/Novosibirsk", primary: false },
      { iana: "Asia/Vladivostok", primary: false },
    ],
  },
  AU: {
    languages: [{ iso639_3: "eng", primary: true }],
    timezones: [
      { iana: "Australia/Sydney", primary: true },
      { iana: "Australia/Melbourne", primary: false },
      { iana: "Australia/Brisbane", primary: false },
      { iana: "Australia/Perth", primary: false },
      { iana: "Australia/Adelaide", primary: false },
      { iana: "Australia/Darwin", primary: false },
    ],
  },
};

for (const [iso, patch] of Object.entries(multi)) {
  if (!countries[iso]) continue;
  countries[iso] = {
    ...countries[iso],
    ...patch,
    currency: countries[iso].currency,
  };
}

const out = { version: 2, countries };
writeFileSync(srcPath, JSON.stringify(out), "utf8");
console.log("wrote v2", Object.keys(countries).length, "countries");
