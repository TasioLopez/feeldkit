import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/repositories/get-field-repository", async () => {
  const { InMemoryFieldRepository } = await import("@/lib/matching/__fixtures__/in-memory-repo");
  const { buildCanonicalRefV1 } = await import("@/lib/domain/canonical-ref");
  const repo = new InMemoryFieldRepository();
  const fromType = repo.addType({ key: "company_industry" });
  const toType = repo.addType({ key: "naics_codes" });
  // Wire canonical_ref so the engine resolves to a canonical industry type
  const canonicalIndustry = repo.addType({
    key: "linkedin_industry_codes",
  });
  // Reuse fromType key for canonical_ref consumer pointer:
  fromType.metadataSchema = buildCanonicalRefV1({
    pack_key: "industry",
    field_type_key: "linkedin_industry_codes",
    relationship: "enum_values",
  });
  const liValue = repo.addValue({
    fieldTypeId: canonicalIndustry.id,
    key: "computer-software",
    label: "Computer Software",
  });
  repo.addAlias({ fieldTypeId: canonicalIndustry.id, fieldValueId: liValue.id, alias: "Software" });
  const naicsValue = repo.addValue({ fieldTypeId: toType.id, key: "naics_5415", label: "Computer Systems Design" });
  repo.addCrosswalk({
    fromFieldTypeId: canonicalIndustry.id,
    fromValueId: liValue.id,
    toFieldTypeId: toType.id,
    toValueId: naicsValue.id,
    crosswalkType: "equivalent_to",
    confidence: 0.9,
    source: "test",
  });
  return { getFieldRepository: () => repo };
});

vi.mock("@/lib/industry/concept-service", () => ({
  translateIndustryCode: async () => ({ concept: null, targets: [], mappings: [] }),
}));

import { translateOne } from "@/lib/translate/translate-service";

describe("translate-service", () => {
  it("resolves from value via canonical_ref and returns crosswalk candidate", async () => {
    const result = await translateOne({
      from_field_key: "company_industry",
      value: "Software",
      to_field_key: "naics_codes",
    });
    expect(result.from.key).toBe("computer-software");
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].via).toBe("crosswalk");
    expect(result.explain.version).toBe("1");
  });

  it("returns unmatched with explain when from value cannot be resolved", async () => {
    const result = await translateOne({
      from_field_key: "company_industry",
      value: "totally unknown phrase",
      to_field_key: "naics_codes",
    });
    expect(result.status).toBe("unmatched");
    expect(result.candidates).toHaveLength(0);
    expect(result.explain.version).toBe("1");
  });
});
