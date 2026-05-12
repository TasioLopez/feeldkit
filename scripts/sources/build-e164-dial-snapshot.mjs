/**
 * One-off / refresh: fetches datasets/country-codes CSV and writes
 * scripts/sources/snapshots/e164-dial-by-iso2.json (ISO2 -> dial string, may include hyphens e.g. 1-242).
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { get } from "node:https";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const url =
  "https://raw.githubusercontent.com/datasets/country-codes/master/data/country-codes.csv";
const outPath = resolve(__dirname, "snapshots", "e164-dial-by-iso2.json");

function parseCsvLine(line) {
  const cols = [];
  let cur = "";
  let q = false;
  for (const ch of line) {
    if (ch === '"') {
      q = !q;
      continue;
    }
    if (ch === "," && !q) {
      cols.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  cols.push(cur);
  return cols;
}

const data = await new Promise((resolvePromise, reject) => {
  get(url, (res) => {
    let d = "";
    res.on("data", (c) => (d += c));
    res.on("end", () => resolvePromise(d));
    res.on("error", reject);
  }).on("error", reject);
});

const lines = data.split(/\r?\n/).filter(Boolean);
const header = parseCsvLine(lines[0]);
const idxDial = header.indexOf("Dial");
const idxIso2 = header.indexOf("ISO3166-1-Alpha-2");
if (idxDial < 0 || idxIso2 < 0) throw new Error("missing columns");

const out = {};
for (let i = 1; i < lines.length; i++) {
  const cols = parseCsvLine(lines[i]);
  const iso2 = (cols[idxIso2] ?? "").trim();
  let dial = (cols[idxDial] ?? "").trim().replace(/[^0-9-]/g, "");
  if (!iso2 || !dial) continue;
  out[iso2] = dial;
}

writeFileSync(outPath, JSON.stringify(out, null, 2), "utf8");
console.log("wrote", outPath, "entries", Object.keys(out).length);
