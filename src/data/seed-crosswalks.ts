export interface SeedCrosswalk {
  fromFieldTypeKey: string;
  fromValueKey: string;
  toFieldTypeKey: string;
  toValueKey: string;
  crosswalkType: string;
  confidence: number;
  source?: string;
  /** Stored on `field_crosswalks.metadata` (e.g. `{ primary: true }` for 1:N official language / timezone rows). */
  metadata?: Record<string, unknown>;
}

export const seedCrosswalks: SeedCrosswalk[] = [
  {
    fromFieldTypeKey: "normalized_job_titles",
    fromValueKey: "vp-engineering",
    toFieldTypeKey: "job_functions",
    toValueKey: "engineering",
    crosswalkType: "title_to_function",
    confidence: 0.92,
    source: "seed",
  },
  {
    fromFieldTypeKey: "normalized_job_titles",
    fromValueKey: "vp-engineering",
    toFieldTypeKey: "seniority_bands",
    toValueKey: "vp",
    crosswalkType: "title_to_seniority",
    confidence: 0.96,
    source: "seed",
  },
];
