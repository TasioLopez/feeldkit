import type { SeedPack } from "@/data/packs/types";
import { geoSourceAdapter } from "./geo-source";
import { industrySourceAdapter } from "./industry-source";
import { jobsSourceAdapter } from "./jobs-source";
import { standardsSourceAdapter } from "./standards-source";

function sortPackDeterministically(pack: SeedPack): SeedPack {
  return {
    ...pack,
    fieldTypes: [...pack.fieldTypes]
      .map((fieldType) => ({
        ...fieldType,
        values: [...fieldType.values].sort((a, b) => a.key.localeCompare(b.key)),
      }))
      .sort((a, b) => a.key.localeCompare(b.key)),
  };
}

export async function buildFullV1Packs(): Promise<SeedPack[]> {
  const adapters = [geoSourceAdapter, standardsSourceAdapter, industrySourceAdapter, jobsSourceAdapter];
  const packs = await Promise.all(adapters.map((adapter) => adapter.run()));
  return packs
    .flat()
    .map(sortPackDeterministically)
    .sort((a, b) => a.key.localeCompare(b.key));
}
