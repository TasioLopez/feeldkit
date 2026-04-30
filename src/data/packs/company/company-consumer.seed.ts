import type { SeedPack } from "@/data/packs/types";
import { buildCanonicalRefV1 } from "@/lib/domain/canonical-ref";

/** Consumer field types with `feeldkit.canonical_ref.v1` (no value rows). Merged into the `company` pack via `mergePacks`. */
export const companyConsumerSeed: SeedPack = {
  key: "company",
  name: "Company",
  version: "2.0.0",
  source: "canonical_refs",
  fieldTypes: [
    {
      key: "company_industry",
      name: "Company industry (consumer)",
      metadata_schema: buildCanonicalRefV1({
        pack_key: "industry",
        field_type_key: "linkedin_industry_codes",
        relationship: "enum_values",
      }),
      values: [],
    },
    {
      key: "company_country",
      name: "Company country (consumer)",
      metadata_schema: buildCanonicalRefV1({
        pack_key: "geo",
        field_type_key: "countries",
        relationship: "enum_values",
      }),
      values: [],
    },
    {
      key: "company_employee_size_band",
      name: "Company employee size (consumer)",
      metadata_schema: buildCanonicalRefV1({
        pack_key: "jobs",
        field_type_key: "company_headcounts",
        relationship: "enum_values",
      }),
      values: [],
    },
  ],
};
