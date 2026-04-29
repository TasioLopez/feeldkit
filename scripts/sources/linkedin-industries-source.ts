import type { SeedValue } from "../../src/data/packs/types";
import { toDeterministicKey } from "./utils";

const LINKEDIN_INDUSTRIES_MARKDOWN_URL =
  "https://raw.githubusercontent.com/MicrosoftDocs/linkedin-api-docs/live/linkedin-api-docs/shared/references/reference-tables/industry-codes-v2.md";

type ParsedIndustry = {
  industryId: number;
  label: string;
  hierarchy: string;
  description: string;
  status: "active" | "inactive";
};

function parseMarkdownRow(line: string): string[] | null {
  if (!line.startsWith("|")) return null;
  const rawParts = line.split("|").map((part) => part.trim());
  if (rawParts.length < 6) return null;
  return rawParts.slice(1, rawParts.length - 1);
}

function cleanCell(input: string): string {
  return input
    .replace(/&gt;/g, ">")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseLinkedinIndustryMarkdown(markdown: string): ParsedIndustry[] {
  const lines = markdown.split(/\r?\n/);
  const rows: ParsedIndustry[] = [];
  let status: ParsedIndustry["status"] = "active";
  for (const line of lines) {
    if (line.includes("## Inactive Nodes")) {
      status = "inactive";
      continue;
    }
    if (line.includes("## Active Nodes")) {
      status = "active";
      continue;
    }
    const parts = parseMarkdownRow(line);
    if (!parts) continue;
    if (parts[0] === "Industry ID" || parts[0] === "---") continue;
    const [idRaw, labelRaw, hierarchyRaw, ...descParts] = parts;
    const id = Number(idRaw);
    if (!Number.isInteger(id)) continue;
    const label = cleanCell(labelRaw);
    const hierarchy = cleanCell(hierarchyRaw);
    const description = cleanCell(descParts.join(" | "));
    if (!label || !hierarchy) continue;
    rows.push({
      industryId: id,
      label,
      hierarchy,
      description,
      status,
    });
  }
  return rows;
}

export async function loadLinkedinIndustryValues(): Promise<SeedValue[]> {
  const text = await fetch(LINKEDIN_INDUSTRIES_MARKDOWN_URL, {
    headers: { "User-Agent": "feeldkit-importer/1.0" },
  })
    .then(async (res) => (res.ok ? await res.text() : null))
    .catch(() => null);
  if (!text) return [];
  const parsed = parseLinkedinIndustryMarkdown(text);
  const values = parsed.map((entry) => {
    const parts = entry.hierarchy.split(">").map((part) => part.trim()).filter(Boolean);
    const parentLabel = parts.length > 1 ? parts[parts.length - 2] : null;
    const parentKey = parentLabel ? `li_industry_${toDeterministicKey(parentLabel)}` : null;
    return {
      key: `li_industry_${entry.industryId}`,
      label: entry.label,
      aliases: [String(entry.industryId), entry.hierarchy].filter(Boolean),
      metadata: {
        source_standard: "linkedin_industry_codes_v2",
        linkedin_industry_id: entry.industryId,
        hierarchy_path: entry.hierarchy,
        depth: parts.length,
        parent_key: parentKey,
        parent_label: parentLabel,
        status: entry.status,
        description: entry.description || null,
      },
    } satisfies SeedValue;
  });
  return values;
}
