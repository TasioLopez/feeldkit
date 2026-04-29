import { practicalIndustriesSeed } from "../../src/data/packs/industry/practical-industries.seed";
import type { IndustryCodeNode, IndustryCrosswalkEdge } from "./industry-interop-types";
import { normalizeText } from "../../src/lib/matching/normalize-text";

export function buildPracticalOverlayNodes(): IndustryCodeNode[] {
  return (practicalIndustriesSeed.fieldTypes[0]?.values ?? []).map((value) => ({
    codeSystem: "practical",
    code: value.key,
    label: value.label,
    hierarchyPath: null,
    parentCode: null,
    status: "active",
    metadata: {
      source_overlay: "practical_industry_overlay",
    },
  }));
}

export function inferPracticalToConceptEdges(practicalNodes: IndustryCodeNode[], linkedinNodes: IndustryCodeNode[]): IndustryCrosswalkEdge[] {
  const edges: IndustryCrosswalkEdge[] = [];
  const linkedinByLabel = new Map(linkedinNodes.map((node) => [normalizeText(node.label), node]));
  for (const practical of practicalNodes) {
    const normalized = normalizeText(practical.label);
    const direct = linkedinByLabel.get(normalized);
    if (direct) {
      edges.push({
        fromSystem: "practical",
        fromCode: practical.code,
        toSystem: "linkedin",
        toCode: direct.code,
        relationType: "equivalent_to",
        mappingQuality: "exact",
        confidence: 0.92,
        source: "practical_exact_label",
        inferred: true,
      });
      continue;
    }
    const fuzzy = linkedinNodes.find((candidate) => normalizeText(candidate.label).includes(normalized) || normalized.includes(normalizeText(candidate.label)));
    if (!fuzzy) continue;
    edges.push({
      fromSystem: "practical",
      fromCode: practical.code,
      toSystem: "linkedin",
      toCode: fuzzy.code,
      relationType: "related_to",
      mappingQuality: "related",
      confidence: 0.7,
      source: "practical_fuzzy_label",
      inferred: true,
    });
  }
  return edges;
}
