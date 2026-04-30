import { describe, expect, it } from "vitest";
import { resolveEnumValuesCanonicalField } from "@/lib/matching/field-reference-resolver";
import { buildCanonicalRefV1 } from "@/lib/domain/canonical-ref";
import type { FieldType } from "@/lib/domain/types";

function ft(partial: Partial<FieldType>): FieldType {
  return {
    id: "id",
    fieldPackId: "pack",
    key: "k",
    name: "n",
    description: "",
    kind: "taxonomy",
    status: "active",
    isPublic: true,
    supportsHierarchy: false,
    supportsRelationships: false,
    supportsLocale: false,
    supportsValidation: false,
    supportsCrosswalks: false,
    metadataSchema: {},
    ...partial,
  };
}

describe("field-reference-resolver", () => {
  it("resolves enum_values canonical field key", () => {
    const r = resolveEnumValuesCanonicalField(
      ft({
        key: "company_industry",
        metadataSchema: buildCanonicalRefV1({
          pack_key: "industry",
          field_type_key: "linkedin_industry_codes",
          relationship: "enum_values",
        }),
      }),
    );
    expect(r?.canonicalFieldKey).toBe("linkedin_industry_codes");
    expect(r?.packKey).toBe("industry");
  });

  it("returns null when ref missing", () => {
    expect(resolveEnumValuesCanonicalField(ft({ metadataSchema: {} }))).toBeNull();
  });
});
