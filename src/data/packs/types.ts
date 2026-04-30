export interface SeedValue {
  key: string;
  label: string;
  aliases?: string[];
  metadata?: Record<string, unknown>;
}

export interface SeedFieldType {
  key: string;
  name: string;
  /** Merged into `field_types.metadata_schema` on ingest (see `feeldkit.canonical_ref.v1`). */
  metadata_schema?: Record<string, unknown>;
  values: SeedValue[];
}

export interface SeedPack {
  key: string;
  name: string;
  version: string;
  source: string;
  fieldTypes: SeedFieldType[];
}
