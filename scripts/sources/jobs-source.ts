import type { SeedPack } from "../../src/data/packs/types";
import { jobFunctionsSeed } from "../../src/data/packs/jobs/functions.seed";
import { seniorityBandsSeed } from "../../src/data/packs/jobs/seniority-bands.seed";
import { normalizedTitlesSeed } from "../../src/data/packs/jobs/normalized-titles.seed";
import { buildPeopleTypologyJobsPack } from "./people-typology-source";
import type { SourceAdapter } from "./types";
import { toDeterministicKey, uniqueByKey, validateSeedValues } from "./utils";

const NORMALIZED_TITLE_BACKBONE = [
  "Software Engineer",
  "Senior Software Engineer",
  "Staff Software Engineer",
  "Engineering Manager",
  "Product Manager",
  "Senior Product Manager",
  "Sales Development Representative",
  "Account Executive",
  "Customer Success Manager",
  "Solutions Engineer",
  "Marketing Manager",
  "Growth Manager",
  "Data Analyst",
  "Data Scientist",
  "Machine Learning Engineer",
  "DevOps Engineer",
  "Site Reliability Engineer",
  "People Operations Manager",
  "Finance Manager",
  "Revenue Operations Manager",
];

export const jobsSourceAdapter: SourceAdapter = {
  name: "jobs-source-adapter",
  async run(): Promise<SeedPack[]> {
    const jobsPack = buildPeopleTypologyJobsPack();
    const overlaysByType = new Map<string, SeedPack["fieldTypes"][number]["values"]>();
    for (const seedPack of [jobFunctionsSeed, seniorityBandsSeed, normalizedTitlesSeed]) {
      for (const fieldType of seedPack.fieldTypes) {
        overlaysByType.set(fieldType.key, [
          ...(overlaysByType.get(fieldType.key) ?? []),
          ...fieldType.values.map((value) => ({
            ...value,
            metadata: { ...(value.metadata ?? {}), source_overlay: "legacy_jobs_overlay" },
          })),
        ]);
      }
    }
    const enrichedPack: SeedPack = {
      ...jobsPack,
      fieldTypes: jobsPack.fieldTypes.map((fieldType) => {
        const overlayValues = overlaysByType.get(fieldType.key) ?? [];
        const defaultBackboneValues =
          fieldType.key === "normalized_job_titles"
            ? NORMALIZED_TITLE_BACKBONE.map((label) => ({
                key: toDeterministicKey(label),
                label,
                metadata: { source_overlay: "practical_titles_backbone" },
              }))
            : [];
        return {
          ...fieldType,
          values: uniqueByKey([...fieldType.values, ...defaultBackboneValues, ...overlayValues]),
        };
      }),
    };
    for (const fieldType of enrichedPack.fieldTypes) {
      validateSeedValues(fieldType.values, `jobs.${fieldType.key}`);
    }

    return [enrichedPack];
  },
};
