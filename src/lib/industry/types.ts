export type IndustryCodeSystem = "linkedin" | "naics" | "nace" | "isic" | "sic" | "gics" | "practical";

export type IndustryConcept = {
  id: string;
  key: string;
  label: string;
  normalizedLabel: string;
  status: string;
  metadata: Record<string, unknown>;
};

export type IndustryConceptCode = {
  id: string;
  conceptId: string;
  codeSystem: IndustryCodeSystem;
  code: string;
  label: string;
  hierarchyPath: string | null;
  parentCode: string | null;
  status: string;
  source: string | null;
  version: string | null;
  metadata: Record<string, unknown>;
};

export type IndustryConceptEdge = {
  id: string;
  fromConceptId: string;
  toConceptId: string;
  relationType: string;
  mappingQuality: string;
  confidence: number;
  source: string | null;
  sourceEvidence: string | null;
  status: "pending" | "approved" | "rejected";
  inferred: boolean;
  metadata: Record<string, unknown>;
};

/** Edge row enriched for admin UI (concept labels + optional code summaries). */
export type IndustryConceptEdgeListItem = IndustryConceptEdge & {
  fromConceptLabel: string;
  toConceptLabel: string;
  /** Short display, e.g. "linkedin:123 · naics:456" */
  fromCodesSummary: string | null;
  toCodesSummary: string | null;
};
