import { describe, expect, it } from "vitest";
import { runInference } from "@/lib/matching/inference/engine";
import { InMemoryFieldRepository } from "@/lib/matching/__fixtures__/in-memory-repo";
import { buildCanonicalRefV1 } from "@/lib/domain/canonical-ref";

describe("inference/engine", () => {
  it("matches via exact_alias and emits explain.v1 with priors and signals", async () => {
    const repo = new InMemoryFieldRepository();
    const type = repo.addType({ key: "tech" });
    const value = repo.addValue({ fieldTypeId: type.id, key: "google-analytics", label: "Google Analytics" });
    repo.addAlias({ fieldTypeId: type.id, fieldValueId: value.id, alias: "GA4" });

    const result = await runInference({ fieldKey: "tech", value: "GA4" }, repo);
    expect(result.winner?.value.key).toBe("google-analytics");
    expect(result.decision.status).toMatch(/matched|suggested/);
    expect(result.explain.version).toBe("1");
    expect(result.explain.signals.some((s) => s.kind === "exact_alias")).toBe(true);
  });

  it("resolves consumer field through canonical_ref to canonical type", async () => {
    const repo = new InMemoryFieldRepository();
    const canonicalType = repo.addType({ key: "linkedin_industry_codes" });
    const value = repo.addValue({
      fieldTypeId: canonicalType.id,
      key: "computer-software",
      label: "Computer Software",
    });
    repo.addAlias({ fieldTypeId: canonicalType.id, fieldValueId: value.id, alias: "Software" });
    repo.addType({
      key: "company_industry",
      metadataSchema: buildCanonicalRefV1({
        pack_key: "industry",
        field_type_key: "linkedin_industry_codes",
        relationship: "enum_values",
      }),
    });

    const result = await runInference({ fieldKey: "company_industry", value: "Software" }, repo);
    expect(result.resolvedFieldKey).toBe("linkedin_industry_codes");
    expect(result.winner?.value.key).toBe("computer-software");
    expect(result.explain.resolved_field_key).toBe("linkedin_industry_codes");
  });

  it("returns explain with no winner when nothing matches", async () => {
    const repo = new InMemoryFieldRepository();
    repo.addType({ key: "x" });
    const result = await runInference({ fieldKey: "x", value: "no match here" }, repo);
    expect(result.winner).toBeNull();
    expect(result.explain.winner).toBeNull();
    expect(result.decision.status).toBe("review");
  });

  it("applies prior_decision boost when input was approved before", async () => {
    const repo = new InMemoryFieldRepository();
    const type = repo.addType({ key: "company_industry" });
    const value = repo.addValue({ fieldTypeId: type.id, key: "tech", label: "Technology" });
    repo.addAlias({ fieldTypeId: type.id, fieldValueId: value.id, alias: "tech" });
    repo.recentDecisions.push(
      { valueId: value.id, status: "approved", source: "mapping_reviews", createdAt: new Date().toISOString() },
      { valueId: value.id, status: "approved", source: "mapping_reviews", createdAt: new Date().toISOString() },
    );
    const result = await runInference({ fieldKey: "company_industry", value: "tech" }, repo);
    expect(result.priorDecisionCount).toBeGreaterThan(0);
    expect(result.explain.priors.decision_count).toBe(result.priorDecisionCount);
  });
});
