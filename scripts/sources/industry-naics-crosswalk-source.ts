import { safeFetchText } from "./utils";
import type { IndustryCodeNode, IndustryCrosswalkEdge } from "./industry-interop-types";

const LINKEDIN_NAICS_MARKDOWN_URL =
  "https://raw.githubusercontent.com/MicrosoftDocs/linkedin-api-docs/live/linkedin-api-docs/shared/references/reference-tables/industry-codes-v2-naics.md";

type LinkedinNaicsRow = {
  linkedinIndustryId: string;
  linkedinIndustryName: string;
  naicsCode: string;
  naicsDescription: string;
};

function parseMarkdownTableRow(line: string): string[] | null {
  if (!line.startsWith("|")) return null;
  const rawParts = line.split("|").map((part) => part.trim());
  if (rawParts.length < 4) return null;
  return rawParts.slice(1, rawParts.length - 1);
}

function cleanCell(input: string): string {
  return input
    .replace(/&gt;/g, ">")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseLinkedinNaicsMarkdown(markdown: string): LinkedinNaicsRow[] {
  const rows: LinkedinNaicsRow[] = [];
  for (const line of markdown.split(/\r?\n/)) {
    const cols = parseMarkdownTableRow(line);
    if (!cols || cols.length < 4) continue;
    const [a, b, c, d] = cols.map(cleanCell);
    if (/^[-\s]+$/.test(a) || a.toLowerCase().includes("linkedin industry")) continue;
    const linkedinIndustryIdMatch = a.match(/\d+/);
    const naicsCodeMatch = c.match(/\d{2,6}/);
    if (!linkedinIndustryIdMatch || !naicsCodeMatch) continue;
    rows.push({
      linkedinIndustryId: linkedinIndustryIdMatch[0],
      linkedinIndustryName: b,
      naicsCode: naicsCodeMatch[0],
      naicsDescription: d || c,
    });
  }
  return rows;
}

export async function loadLinkedinNaicsCrosswalk(): Promise<{
  naicsNodes: IndustryCodeNode[];
  edges: IndustryCrosswalkEdge[];
}> {
  const markdown = await safeFetchText(LINKEDIN_NAICS_MARKDOWN_URL);
  const parsed = markdown ? parseLinkedinNaicsMarkdown(markdown) : [];
  const naicsByCode = new Map<string, IndustryCodeNode>();
  for (const row of parsed) {
    if (!naicsByCode.has(row.naicsCode)) {
      const parentCode = row.naicsCode.length > 2 ? row.naicsCode.slice(0, row.naicsCode.length - 1) : null;
      naicsByCode.set(row.naicsCode, {
        codeSystem: "naics",
        code: row.naicsCode,
        label: row.naicsDescription,
        hierarchyPath: row.naicsCode,
        parentCode,
        status: "active",
        metadata: {
          source_standard: "linkedin_naics_crosswalk_v2",
        },
      });
    }
  }
  const edges: IndustryCrosswalkEdge[] = parsed.map((row) => ({
    fromSystem: "linkedin",
    fromCode: row.linkedinIndustryId,
    toSystem: "naics",
    toCode: row.naicsCode,
    relationType: "equivalent_to",
    mappingQuality: "exact",
    confidence: 0.99,
    source: "linkedin_industry_codes_v2_naics",
    evidence: `${row.linkedinIndustryName} -> ${row.naicsDescription}`,
    inferred: false,
    metadata: {},
  }));

  return {
    naicsNodes: [...naicsByCode.values()],
    edges,
  };
}
