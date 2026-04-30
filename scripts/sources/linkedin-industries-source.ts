import type { SeedValue } from "../../src/data/packs/types";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  fetchTextWithDiagnostics,
  readSnapshotTextWithDiagnostics,
  toDeterministicKey,
  type SourceFetchDiagnostics,
} from "./utils";
import type { IndustryCodeNode } from "./industry-interop-types";

const LINKEDIN_INDUSTRIES_MARKDOWN_URL =
  "https://learn.microsoft.com/en-us/linkedin/shared/references/reference-tables/industry-codes-v2";
const SNAPSHOT_VERSION = "2026-04-29";
const SNAPSHOT_PATH = resolve(
  fileURLToPath(new URL(".", import.meta.url)),
  "snapshots",
  "linkedin-industry-codes-v2.snapshot.md",
);
const LINKEDIN_MIN_ROWS = 10;

export type ParsedIndustry = {
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

function stripHtml(input: string): string {
  return cleanCell(
    input
      .replace(/<\/(p|div|summary|details)>/gi, " ")
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  );
}

function parseHtmlTableRows(html: string): string[][] {
  const rows: string[][] = [];
  const trMatches = html.match(/<tr[\s\S]*?<\/tr>/gi) ?? [];
  for (const tr of trMatches) {
    const cellMatches = tr.match(/<t[dh][^>]*>[\s\S]*?<\/t[dh]>/gi) ?? [];
    if (cellMatches.length < 4) {
      continue;
    }
    const cells = cellMatches.map((cell) => stripHtml(cell));
    rows.push(cells);
  }
  return rows;
}

function parseLinkedinIndustriesHtml(html: string): ParsedIndustry[] {
  const inactiveMarker = html.search(/inactive nodes/i);
  const activeHtml = inactiveMarker >= 0 ? html.slice(0, inactiveMarker) : html;
  const inactiveHtml = inactiveMarker >= 0 ? html.slice(inactiveMarker) : "";
  const rows: ParsedIndustry[] = [];
  const parseChunk = (chunk: string, status: ParsedIndustry["status"]) => {
    for (const row of parseHtmlTableRows(chunk)) {
      const [idRaw, labelRaw, hierarchyRaw, ...descParts] = row;
      if (!idRaw || /industry id/i.test(idRaw)) {
        continue;
      }
      const idMatch = idRaw.match(/\d+/);
      if (!idMatch) {
        continue;
      }
      const id = Number(idMatch[0]);
      if (!Number.isInteger(id)) {
        continue;
      }
      const label = stripHtml(labelRaw);
      const hierarchy = stripHtml(hierarchyRaw);
      const description = stripHtml(descParts.join(" "));
      if (!label || !hierarchy) {
        continue;
      }
      rows.push({
        industryId: id,
        label,
        hierarchy,
        description,
        status,
      });
    }
  };
  parseChunk(activeHtml, "active");
  parseChunk(inactiveHtml, "inactive");
  return rows;
}

export function parseLinkedinIndustryMarkdown(markdown: string): ParsedIndustry[] {
  if (/<table[\s>]/i.test(markdown) && /industry id/i.test(markdown)) {
    return parseLinkedinIndustriesHtml(markdown);
  }
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

export type LinkedinIndustrySourceDiagnostics = {
  dataset: "linkedin_industry_codes_v2";
  fetch: SourceFetchDiagnostics;
  fallback_used: boolean;
  parsed_rows: number;
  minimum_rows: number;
  parse_ok: boolean;
  parse_error: string | null;
};

type LinkedinIndustryLoadResult = {
  rows: ParsedIndustry[];
  diagnostics: LinkedinIndustrySourceDiagnostics;
};

function extractHierarchyParts(hierarchy: string): string[] {
  return hierarchy
    .split(">")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function assertLinkedinIndustryParseQuality(markdown: string, rows: ParsedIndustry[], minimumRows: number): void {
  const hasActiveMarker = markdown.includes("## Active Nodes") || /active nodes/i.test(markdown);
  if (!hasActiveMarker) {
    throw new Error("missing active nodes section");
  }
  if (rows.length < minimumRows) {
    throw new Error(`parsed_rows_below_minimum:${rows.length}<${minimumRows}`);
  }
}

async function loadLinkedinIndustries(
  options?: { forceSnapshots?: boolean; minimumRows?: number },
): Promise<LinkedinIndustryLoadResult> {
  const minimumRows = options?.minimumRows ?? LINKEDIN_MIN_ROWS;
  const network = options?.forceSnapshots
    ? null
    : await fetchTextWithDiagnostics(LINKEDIN_INDUSTRIES_MARKDOWN_URL, { timeoutMs: 15000, maxAttempts: 3 });
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
      const rows = parseLinkedinIndustryMarkdown(candidate.text);
      assertLinkedinIndustryParseQuality(candidate.text, rows, minimumRows);
      return {
        rows,
        diagnostics: {
          dataset: "linkedin_industry_codes_v2",
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
      dataset: "linkedin_industry_codes_v2",
      fetch:
        fallbackDiagnostics ??
        {
          source_mode: "network",
          url: LINKEDIN_INDUSTRIES_MARKDOWN_URL,
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

function toLinkedinParentCode(parsed: ParsedIndustry[]): Map<number, string | null> {
  const byHierarchy = new Map(parsed.map((row) => [row.hierarchy, row.industryId]));
  const parentById = new Map<number, string | null>();
  for (const row of parsed) {
    const parts = extractHierarchyParts(row.hierarchy);
    if (parts.length <= 1) {
      parentById.set(row.industryId, null);
      continue;
    }
    const parentPath = parts.slice(0, -1).join(" > ");
    const parentId = byHierarchy.get(parentPath);
    parentById.set(row.industryId, parentId ? String(parentId) : null);
  }
  return parentById;
}

export async function loadLinkedinIndustryValues(options?: {
  forceSnapshots?: boolean;
}): Promise<SeedValue[]> {
  const source = await loadLinkedinIndustries({ forceSnapshots: options?.forceSnapshots });
  if (!source.rows.length) return [];
  const parentById = toLinkedinParentCode(source.rows);
  return source.rows.map((entry) => {
    const parts = extractHierarchyParts(entry.hierarchy);
    const parentLabel = parts.length > 1 ? parts[parts.length - 2] : null;
    const parentCode = parentById.get(entry.industryId) ?? null;
    return {
      key: `li_industry_${entry.industryId}`,
      label: entry.label,
      aliases: [String(entry.industryId), entry.hierarchy].filter(Boolean),
      metadata: {
        source_standard: "linkedin_industry_codes_v2",
        source_mode: source.diagnostics.fetch.source_mode,
        linkedin_industry_id: entry.industryId,
        hierarchy_path: entry.hierarchy,
        depth: parts.length,
        parent_code: parentCode,
        parent_key: parentCode ? `li_industry_${parentCode}` : null,
        parent_label: parentLabel,
        status: entry.status,
        description: entry.description || null,
      },
    } satisfies SeedValue;
  });
}

export async function loadLinkedinIndustryNodesWithDiagnostics(options?: {
  forceSnapshots?: boolean;
}): Promise<{ nodes: IndustryCodeNode[]; diagnostics: LinkedinIndustrySourceDiagnostics }> {
  const source = await loadLinkedinIndustries({ forceSnapshots: options?.forceSnapshots });
  if (!source.rows.length) return { nodes: [], diagnostics: source.diagnostics };
  const parentById = toLinkedinParentCode(source.rows);
  const nodes = source.rows.map((entry) => {
    const parts = extractHierarchyParts(entry.hierarchy);
    return {
      codeSystem: "linkedin",
      code: String(entry.industryId),
      label: entry.label,
      hierarchyPath: entry.hierarchy,
      parentCode: parentById.get(entry.industryId) ?? null,
      status: entry.status,
      description: entry.description || null,
      metadata: {
        source_standard: "linkedin_industry_codes_v2",
        source_mode: source.diagnostics.fetch.source_mode,
        linkedin_industry_id: entry.industryId,
        depth: parts.length,
      },
    } satisfies IndustryCodeNode;
  });
  return { nodes, diagnostics: source.diagnostics };
}

export async function loadLinkedinIndustryNodes(options?: {
  forceSnapshots?: boolean;
}): Promise<IndustryCodeNode[]> {
  const result = await loadLinkedinIndustryNodesWithDiagnostics(options);
  return result.nodes;
}

export async function loadLinkedinIndustrySourceDiagnostics(options?: {
  forceSnapshots?: boolean;
}): Promise<LinkedinIndustrySourceDiagnostics> {
  const result = await loadLinkedinIndustryNodesWithDiagnostics({ forceSnapshots: options?.forceSnapshots });
  return result.diagnostics;
}
