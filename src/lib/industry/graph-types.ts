export type IndustryCodeSystem = "linkedin" | "naics" | "nace" | "isic" | "sic" | "gics" | "practical";

export type IndustryCodeNode = {
  codeSystem: IndustryCodeSystem;
  code: string;
  label: string;
  hierarchyPath: string | null;
  parentCode: string | null;
  status: "active" | "inactive" | "deprecated";
  description?: string | null;
  metadata?: Record<string, unknown>;
};

export type IndustryCrosswalkEdge = {
  fromSystem: IndustryCodeSystem;
  fromCode: string;
  toSystem: IndustryCodeSystem;
  toCode: string;
  relationType: "equivalent_to" | "broader_than" | "narrower_than" | "related_to" | "deprecated_to";
  mappingQuality: "exact" | "broader_than" | "narrower_than" | "related" | "deprecated_to";
  confidence: number;
  source: string;
  evidence?: string | null;
  inferred?: boolean;
  metadata?: Record<string, unknown>;
};

export type IndustryConceptGraph = {
  nodes: IndustryCodeNode[];
  edges: IndustryCrosswalkEdge[];
};
