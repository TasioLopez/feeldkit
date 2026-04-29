import type { SeedPack } from "../../src/data/packs/types";
import { practicalIndustriesSeed } from "../../src/data/packs/industry/practical-industries.seed";
import { loadLinkedinIndustryValues } from "./linkedin-industries-source";
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
    const linkedinValues = await loadLinkedinIndustryValues();
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
      version: "1.1.0",
      source: "official+overlay",
      fieldTypes: [
        {
          ...practicalIndustriesSeed.fieldTypes[0],
          values: uniqueByKey([...linkedinValues, ...standardValues, ...overlayValues]),
        },
      ],
    };
    validateSeedValues(pack.fieldTypes[0]?.values ?? [], "industry.practical");
    return [pack];
  },
};
