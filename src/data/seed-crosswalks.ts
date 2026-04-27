export interface SeedCrosswalk {
  fromFieldTypeKey: string;
  fromValueKey: string;
  toFieldTypeKey: string;
  toValueKey: string;
  crosswalkType: string;
  confidence: number;
  source?: string;
}

export const seedCrosswalks: SeedCrosswalk[] = [
  {
    fromFieldTypeKey: "countries",
    fromValueKey: "netherlands",
    toFieldTypeKey: "currencies",
    toValueKey: "eur",
    crosswalkType: "country_default_currency",
    confidence: 0.99,
    source: "seed",
  },
  {
    fromFieldTypeKey: "countries",
    fromValueKey: "netherlands",
    toFieldTypeKey: "languages",
    toValueKey: "nl",
    crosswalkType: "country_official_language",
    confidence: 0.99,
    source: "seed",
  },
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
