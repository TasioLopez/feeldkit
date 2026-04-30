import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  fetchTextWithDiagnostics,
  readSnapshotTextWithDiagnostics,
  type SourceFetchDiagnostics,
} from "./utils";
import type { IndustryCodeNode, IndustryCrosswalkEdge } from "./industry-interop-types";

const LINKEDIN_NAICS_MARKDOWN_URL =
  "https://learn.microsoft.com/en-us/linkedin/shared/references/reference-tables/industry-codes-v2-naics";
const SNAPSHOT_VERSION = "2026-04-29";
const SNAPSHOT_PATH = resolve(
  fileURLToPath(new URL(".", import.meta.url)),
  "snapshots",
  "industry-codes-v2-naics.snapshot.md",
);
const NAICS_MIN_ROWS = 10;

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

function stripHtml(input: string): string {
  return cleanCell(input.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, " "));
}

function parseHtmlTableRows(html: string): string[][] {
  const rows: string[][] = [];
  const trMatches = html.match(/<tr[\s\S]*?<\/tr>/gi) ?? [];
  for (const tr of trMatches) {
    const cellMatches = tr.match(/<t[dh][^>]*>[\s\S]*?<\/t[dh]>/gi) ?? [];
    if (cellMatches.length < 4) continue;
    rows.push(cellMatches.map((cell) => stripHtml(cell)));
  }
  return rows;
}

export function parseLinkedinNaicsMarkdown(markdown: string): LinkedinNaicsRow[] {
  if (/<table[\s>]/i.test(markdown) && /linkedin industry/i.test(markdown)) {
    return parseLinkedinNaicsHtml(markdown);
  }
  const rows: LinkedinNaicsRow[] = [];
  for (const line of markdown.split(/\r?\n/)) {
    const cols = parseMarkdownTableRow(line);
    if (!cols || cols.length < 4) continue;
    const [a, b, c, d] = cols.map(cleanCell);
    if (/^[-\s]+$/.test(a) || /linkedin industry|naics/i.test(a)) continue;

    const oldLinkedinIndustryIdMatch = a.match(/\d+/);
    const oldNaicsCodeMatch = c.match(/\d{2,6}/);
    const newNaicsCodeMatch = b.match(/\d{2,6}/);
    const newLinkedinIndustryIdMatch = c.match(/\d+/);

    if (oldLinkedinIndustryIdMatch && oldNaicsCodeMatch) {
      rows.push({
        linkedinIndustryId: oldLinkedinIndustryIdMatch[0],
        linkedinIndustryName: b,
        naicsCode: oldNaicsCodeMatch[0],
        naicsDescription: d || c,
      });
      continue;
    }

    if (newLinkedinIndustryIdMatch && newNaicsCodeMatch) {
      rows.push({
        linkedinIndustryId: newLinkedinIndustryIdMatch[0],
        linkedinIndustryName: d || c,
        naicsCode: newNaicsCodeMatch[0],
        naicsDescription: a || b,
      });
    }
  }
  return rows;
}

function parseLinkedinNaicsHtml(html: string): LinkedinNaicsRow[] {
  const rows: LinkedinNaicsRow[] = [];
  for (const cols of parseHtmlTableRows(html)) {
    if (cols.length < 4) continue;
    const [a, b, c, d] = cols.map(cleanCell);
    if (/industry id|naics/i.test(a) || /^[-\s]+$/.test(a)) continue;
    const oldLinkedinIndustryIdMatch = a.match(/\d+/);
    const oldNaicsCodeMatch = c.match(/\d{2,6}/);
    const newNaicsCodeMatch = b.match(/\d{2,6}/);
    const newLinkedinIndustryIdMatch = c.match(/\d+/);

    if (oldLinkedinIndustryIdMatch && oldNaicsCodeMatch) {
      rows.push({
        linkedinIndustryId: oldLinkedinIndustryIdMatch[0],
        linkedinIndustryName: b,
        naicsCode: oldNaicsCodeMatch[0],
        naicsDescription: d || c,
      });
      continue;
    }

    if (newLinkedinIndustryIdMatch && newNaicsCodeMatch) {
      rows.push({
        linkedinIndustryId: newLinkedinIndustryIdMatch[0],
        linkedinIndustryName: d || c,
        naicsCode: newNaicsCodeMatch[0],
        naicsDescription: a || b,
      });
    }
  }
  return rows;
}

export type LinkedinNaicsSourceDiagnostics = {
  dataset: "linkedin_industry_codes_v2_naics";
  fetch: SourceFetchDiagnostics;
  fallback_used: boolean;
  parsed_rows: number;
  minimum_rows: number;
  parse_ok: boolean;
  parse_error: string | null;
};

type LinkedinNaicsLoadResult = {
  rows: LinkedinNaicsRow[];
  diagnostics: LinkedinNaicsSourceDiagnostics;
};

export function assertLinkedinNaicsParseQuality(markdown: string, rows: LinkedinNaicsRow[], minimumRows: number): void {
  if (!/linkedin industry/i.test(markdown) || !/naics/i.test(markdown)) {
    throw new Error("missing linkedin industry id header");
  }
  if (rows.length < minimumRows) {
    throw new Error(`parsed_rows_below_minimum:${rows.length}<${minimumRows}`);
  }
}

async function loadLinkedinNaicsRows(options?: {
  forceSnapshots?: boolean;
  minimumRows?: number;
}): Promise<LinkedinNaicsLoadResult> {
  const minimumRows = options?.minimumRows ?? NAICS_MIN_ROWS;
  const network = options?.forceSnapshots
    ? null
    : await fetchTextWithDiagnostics(LINKEDIN_NAICS_MARKDOWN_URL, { timeoutMs: 15000, maxAttempts: 3 });
  const candidates = network
    ? [network, await readSnapshotTextWithDiagnostics(SNAPSHOT_PATH, { version: SNAPSHOT_VERSION })]
    : [await readSnapshotTextWithDiagnostics(SNAPSHOT_PATH, { version: SNAPSHOT_VERSION })];
  let parseError: string | null = null;

  for (const candidate of candidates) {
    if (!candidate.text) {
      parseError = candidate.diagnostics.error_message;
      continue;
    }
    try {
      const rows = parseLinkedinNaicsMarkdown(candidate.text);
      assertLinkedinNaicsParseQuality(candidate.text, rows, minimumRows);
      return {
        rows,
        diagnostics: {
          dataset: "linkedin_industry_codes_v2_naics",
          fetch: candidate.diagnostics,
          fallback_used: candidate.diagnostics.source_mode === "snapshot",
          parsed_rows: rows.length,
          minimum_rows: minimumRows,
          parse_ok: true,
          parse_error: null,
        },
      };
    } catch (error) {
      parseError = error instanceof Error ? error.message : String(error);
    }
  }

  const fallbackDiagnostics = candidates[candidates.length - 1]?.diagnostics;
  return {
    rows: [],
    diagnostics: {
      dataset: "linkedin_industry_codes_v2_naics",
      fetch:
        fallbackDiagnostics ??
        {
          source_mode: "network",
          url: LINKEDIN_NAICS_MARKDOWN_URL,
          ok: false,
          status: null,
          attempts: 1,
          duration_ms: 0,
          error_kind: "unknown",
          error_message: "source unavailable",
          payload_sha256: null,
          payload_bytes: 0,
          snapshot_version: null,
        },
      fallback_used: false,
      parsed_rows: 0,
      minimum_rows: minimumRows,
      parse_ok: false,
      parse_error: parseError,
    },
  };
}

export async function loadLinkedinNaicsCrosswalk(options?: {
  forceSnapshots?: boolean;
}): Promise<{
  naicsNodes: IndustryCodeNode[];
  edges: IndustryCrosswalkEdge[];
  diagnostics: LinkedinNaicsSourceDiagnostics;
}> {
  const source = await loadLinkedinNaicsRows({ forceSnapshots: options?.forceSnapshots });
  const parsed = source.rows;
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
    diagnostics: source.diagnostics,
  };
}

export async function loadLinkedinNaicsDiagnostics(options?: {
  forceSnapshots?: boolean;
}): Promise<LinkedinNaicsSourceDiagnostics> {
  const source = await loadLinkedinNaicsRows({ forceSnapshots: options?.forceSnapshots });
  return source.diagnostics;
}
