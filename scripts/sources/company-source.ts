import type { SeedFieldType, SeedPack } from "../../src/data/packs/types";
import { companyConsumerSeed } from "../../src/data/packs/company/company-consumer.seed";
import { companyTypesSeed } from "../../src/data/packs/company/company-types.seed";
import { employeeBandsSeed } from "../../src/data/packs/company/employee-bands.seed";
import type { SourceAdapter } from "./types";
import { validateSeedValues } from "./utils";

export const companySourceAdapter: SourceAdapter = {
  name: "company-source-adapter",
  async run(): Promise<SeedPack[]> {
    const byKey = new Map<string, SeedFieldType>();
    for (const ft of companyTypesSeed.fieldTypes) {
      byKey.set(ft.key, ft);
    }
    for (const ft of employeeBandsSeed.fieldTypes) {
      byKey.set(ft.key, ft);
    }
    for (const ft of companyConsumerSeed.fieldTypes) {
      byKey.set(ft.key, ft);
    }
    const fieldTypes = [...byKey.values()];

    for (const ft of fieldTypes) {
      if (ft.values.length) {
        validateSeedValues(ft.values, `company.${ft.key}`);
      }
    }

    const pack: SeedPack = {
      key: "company",
      name: "Company",
      version: "2.0.0",
      source: "manual+canonical_refs",
      fieldTypes,
    };

    return [pack];
  },
};
