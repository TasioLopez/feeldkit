export interface SeedValue {
  key: string;
  label: string;
  aliases?: string[];
  metadata?: Record<string, unknown>;
}

export interface SeedFieldType {
  key: string;
  name: string;
  values: SeedValue[];
}

export interface SeedPack {
  key: string;
  name: string;
  version: string;
  source: string;
  fieldTypes: SeedFieldType[];
}
