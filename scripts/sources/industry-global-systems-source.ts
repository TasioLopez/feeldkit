import type { IndustryCodeNode, IndustryCrosswalkEdge } from "./industry-interop-types";
import { normalizeText } from "../../src/lib/matching/normalize-text";

const NACE_TOP_LEVEL: Array<[string, string]> = [
  ["A", "Agriculture, forestry and fishing"],
  ["B", "Mining and quarrying"],
  ["C", "Manufacturing"],
  ["D", "Electricity, gas, steam and air conditioning supply"],
  ["E", "Water supply; sewerage, waste management and remediation activities"],
  ["F", "Construction"],
  ["G", "Wholesale and retail trade; repair of motor vehicles and motorcycles"],
  ["H", "Transportation and storage"],
  ["I", "Accommodation and food service activities"],
  ["J", "Information and communication"],
  ["K", "Financial and insurance activities"],
  ["L", "Real estate activities"],
  ["M", "Professional, scientific and technical activities"],
  ["N", "Administrative and support service activities"],
  ["O", "Public administration and defence; compulsory social security"],
  ["P", "Education"],
  ["Q", "Human health and social work activities"],
  ["R", "Arts, entertainment and recreation"],
  ["S", "Other service activities"],
];

const ISIC_TOP_LEVEL: Array<[string, string]> = [
  ["A", "Agriculture, forestry and fishing"],
  ["B", "Mining and quarrying"],
  ["C", "Manufacturing"],
  ["D", "Electricity, gas, steam and air conditioning supply"],
  ["E", "Water supply; sewerage, waste management and remediation activities"],
  ["F", "Construction"],
  ["G", "Wholesale and retail trade; repair of motor vehicles and motorcycles"],
  ["H", "Transportation and storage"],
  ["I", "Accommodation and food service activities"],
  ["J", "Information and communication"],
  ["K", "Financial and insurance activities"],
  ["L", "Real estate activities"],
  ["M", "Professional, scientific and technical activities"],
  ["N", "Administrative and support service activities"],
  ["O", "Public administration and defence; compulsory social security"],
  ["P", "Education"],
  ["Q", "Human health and social work activities"],
  ["R", "Arts, entertainment and recreation"],
  ["S", "Other service activities"],
];

const SIC_DIVISIONS: Array<[string, string]> = [
  ["A", "Agriculture, Forestry, and Fishing"],
  ["B", "Mining"],
  ["C", "Construction"],
  ["D", "Manufacturing"],
  ["E", "Transportation, Communications, Electric, Gas, and Sanitary Services"],
  ["F", "Wholesale Trade"],
  ["G", "Retail Trade"],
  ["H", "Finance, Insurance, and Real Estate"],
  ["I", "Services"],
  ["J", "Public Administration"],
];

const GICS_SECTORS: Array<[string, string]> = [
  ["10", "Energy"],
  ["15", "Materials"],
  ["20", "Industrials"],
  ["25", "Consumer Discretionary"],
  ["30", "Consumer Staples"],
  ["35", "Health Care"],
  ["40", "Financials"],
  ["45", "Information Technology"],
  ["50", "Communication Services"],
  ["55", "Utilities"],
  ["60", "Real Estate"],
];

function toNodes(codeSystem: IndustryCodeNode["codeSystem"], source: string, items: Array<[string, string]>): IndustryCodeNode[] {
  return items.map(([code, label]) => ({
    codeSystem,
    code,
    label,
    hierarchyPath: code,
    parentCode: null,
    status: "active",
    metadata: {
      source_standard: source,
    },
  }));
}

function keywordTokens(label: string): string[] {
  return normalizeText(label).split(" ").filter(Boolean);
}

export function buildGlobalSystemNodes(): IndustryCodeNode[] {
  return [
    ...toNodes("nace", "nace_rev2_top_level", NACE_TOP_LEVEL),
    ...toNodes("isic", "isic_rev4_top_level", ISIC_TOP_LEVEL),
    ...toNodes("sic", "sic_divisions", SIC_DIVISIONS),
    ...toNodes("gics", "gics_sectors", GICS_SECTORS),
  ];
}

export function inferNaicsToGlobalEdges(naicsNodes: IndustryCodeNode[], globalNodes: IndustryCodeNode[]): IndustryCrosswalkEdge[] {
  const edges: IndustryCrosswalkEdge[] = [];
  for (const naics of naicsNodes) {
    const naicsTokens = keywordTokens(naics.label);
    for (const target of globalNodes) {
      if (target.codeSystem === "naics") continue;
      const targetTokens = new Set(keywordTokens(target.label));
      const overlap = naicsTokens.filter((token) => targetTokens.has(token)).length;
      if (overlap < 2) continue;
      edges.push({
        fromSystem: "naics",
        fromCode: naics.code,
        toSystem: target.codeSystem,
        toCode: target.code,
        relationType: "related_to",
        mappingQuality: "related",
        confidence: Math.min(0.95, 0.5 + overlap * 0.1),
        source: "keyword_inference",
        evidence: `token_overlap=${overlap}`,
        inferred: true,
        metadata: {
          overlap,
        },
      });
    }
  }
  return edges;
}
