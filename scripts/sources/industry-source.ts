import type { SeedPack } from "../../src/data/packs/types";
import { practicalIndustriesSeed } from "../../src/data/packs/industry/practical-industries.seed";
import { buildIndustryConceptGraph } from "./industry-concept-graph";
import type { SourceAdapter } from "./types";
import { toDeterministicKey, uniqueByKey, validateSeedValues } from "./utils";

const INDUSTRY_BACKBONE = [
  "Agriculture",
  "Construction",
  "Manufacturing",
  "Transportation and Logistics",
  "Wholesale",
  "Retail",
  "Information Technology",
  "Financial Services",
  "Insurance",
  "Healthcare",
  "Pharmaceuticals",
  "Biotechnology",
  "Education",
  "Government",
  "Real Estate",
  "Energy",
  "Media and Entertainment",
  "Telecommunications",
  "Hospitality",
  "Professional Services",
];

export const industrySourceAdapter: SourceAdapter = {
  name: "industry-source-adapter",
  async run(): Promise<SeedPack[]> {
    const graph = await buildIndustryConceptGraph();
    const bySystem = new Map<string, Array<{ code: string; label: string; hierarchyPath: string | null; metadata?: Record<string, unknown> }>>();
    for (const node of graph.nodes) {
      bySystem.set(node.codeSystem, [
        ...(bySystem.get(node.codeSystem) ?? []),
        {
          code: node.code,
          label: node.label,
          hierarchyPath: node.hierarchyPath,
          metadata: node.metadata,
        },
      ]);
    }
    const linkedinValues = (bySystem.get("linkedin") ?? []).map((entry) => ({
      key: `li_industry_${entry.code}`,
      label: entry.label,
      aliases: [entry.code, entry.hierarchyPath ?? ""].filter(Boolean),
      metadata: {
        source_standard: "linkedin_industry_codes_v2",
        code_system: "linkedin",
        code: entry.code,
        hierarchy_path: entry.hierarchyPath,
        ...(entry.metadata ?? {}),
      },
    }));
    const naicsValues = (bySystem.get("naics") ?? []).map((entry) => ({
      key: `naics_${entry.code}`,
      label: entry.label,
      aliases: [entry.code],
      metadata: {
        source_standard: "naics",
        code_system: "naics",
        code: entry.code,
        hierarchy_path: entry.hierarchyPath,
      },
    }));
    const naceValues = (bySystem.get("nace") ?? []).map((entry) => ({
      key: `nace_${toDeterministicKey(entry.code)}`,
      label: entry.label,
      aliases: [entry.code],
      metadata: { source_standard: "nace", code_system: "nace", code: entry.code },
    }));
    const isicValues = (bySystem.get("isic") ?? []).map((entry) => ({
      key: `isic_${toDeterministicKey(entry.code)}`,
      label: entry.label,
      aliases: [entry.code],
      metadata: { source_standard: "isic", code_system: "isic", code: entry.code },
    }));
    const sicValues = (bySystem.get("sic") ?? []).map((entry) => ({
      key: `sic_${toDeterministicKey(entry.code)}`,
      label: entry.label,
      aliases: [entry.code],
      metadata: { source_standard: "sic", code_system: "sic", code: entry.code },
    }));
    const gicsValues = (bySystem.get("gics") ?? []).map((entry) => ({
      key: `gics_${entry.code}`,
      label: entry.label,
      aliases: [entry.code],
      metadata: { source_standard: "gics", code_system: "gics", code: entry.code },
    }));
    const practicalSystemValues = (bySystem.get("practical") ?? []).map((entry) => ({
      key: `practical_${toDeterministicKey(entry.code)}`,
      label: entry.label,
      aliases: [entry.code],
      metadata: {
        source_overlay: "practical_industry_overlay",
        code_system: "practical",
        code: entry.code,
      },
    }));
    const standardValues = INDUSTRY_BACKBONE.map((label) => ({
      key: toDeterministicKey(label),
      label,
      metadata: { source_standard: "industry_backbone_v1" },
    }));
    const overlayValues = (practicalIndustriesSeed.fieldTypes[0]?.values ?? []).map((value) => ({
      ...value,
      metadata: { ...(value.metadata ?? {}), source_overlay: "practical_industry_overlay" },
    }));

    const pack: SeedPack = {
      ...practicalIndustriesSeed,
      version: "2.0.0",
      source: "official+overlay",
      fieldTypes: [
        {
          ...practicalIndustriesSeed.fieldTypes[0],
          values: uniqueByKey([...linkedinValues, ...standardValues, ...practicalSystemValues, ...overlayValues]),
        },
        { key: "linkedin_industry_codes", name: "LinkedIn Industry Codes", values: uniqueByKey(linkedinValues) },
        { key: "naics_codes", name: "NAICS Codes", values: uniqueByKey(naicsValues) },
        { key: "nace_sections", name: "NACE Sections", values: uniqueByKey(naceValues) },
        { key: "isic_sections", name: "ISIC Sections", values: uniqueByKey(isicValues) },
        { key: "sic_divisions", name: "SIC Divisions", values: uniqueByKey(sicValues) },
        { key: "gics_sectors", name: "GICS Sectors", values: uniqueByKey(gicsValues) },
      ],
    };
    for (const fieldType of pack.fieldTypes) {
      validateSeedValues(fieldType.values, `industry.${fieldType.key}`);
    }
    return [pack];
  },
};
