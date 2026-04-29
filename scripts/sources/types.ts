import type { SeedPack } from "../../src/data/packs/types";

export interface SourceAdapter {
  name: string;
  run(): Promise<SeedPack[]>;
}

export type SourceValue = {
  key: string;
  label: string;
  aliases?: string[];
  metadata?: Record<string, unknown>;
};
