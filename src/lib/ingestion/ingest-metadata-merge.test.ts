import { describe, expect, it } from "vitest";
import { mergeFieldTypeMetadataSchema } from "@/lib/ingestion/ingest-pack";
import { FEELDKIT_CANONICAL_REF_V1, FEELDKIT_METADATA_LOCK } from "@/lib/domain/canonical-ref";

describe("mergeFieldTypeMetadataSchema", () => {
  it("fills missing keys from seed without clobbering existing canonical ref", () => {
    const existing = {
      [FEELDKIT_CANONICAL_REF_V1]: { pack_key: "industry", field_type_key: "linkedin_industry_codes", relationship: "enum_values" },
      feeldkit_other: { a: 1 },
    };
    const incoming = {
      [FEELDKIT_CANONICAL_REF_V1]: { pack_key: "geo", field_type_key: "countries", relationship: "enum_values" },
      new_key: true,
    };
    const merged = mergeFieldTypeMetadataSchema(existing, incoming, {});
    expect(merged[FEELDKIT_CANONICAL_REF_V1]).toEqual(existing[FEELDKIT_CANONICAL_REF_V1]);
    expect(merged.new_key).toBe(true);
  });

  it("respects metadata lock", () => {
    const existing = { [FEELDKIT_METADATA_LOCK]: true, keep: 1 };
    const incoming = { new_key: true };
    expect(mergeFieldTypeMetadataSchema(existing, incoming, {})).toEqual(existing);
  });

  it("forceOverwrite replaces ref", () => {
    const existing = {
      [FEELDKIT_CANONICAL_REF_V1]: { pack_key: "a", field_type_key: "b", relationship: "enum_values" as const },
    };
    const incoming = {
      [FEELDKIT_CANONICAL_REF_V1]: { pack_key: "geo", field_type_key: "countries", relationship: "enum_values" as const },
    };
    const merged = mergeFieldTypeMetadataSchema(existing, incoming, { forceOverwrite: true });
    expect((merged[FEELDKIT_CANONICAL_REF_V1] as { pack_key: string }).pack_key).toBe("geo");
  });
});
