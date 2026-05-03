import { describe, expect, it } from "vitest";
import { buildExplain, emptyExplain } from "@/lib/matching/inference/explain";
import { makeSignal } from "@/lib/matching/inference/signal";
import type { ScoredCandidate } from "@/lib/matching/inference/scorer";
import type { FieldValue } from "@/lib/domain/types";

function fv(id: string, key: string, label: string): FieldValue {
  return {
    id,
    fieldTypeId: "ft",
    key,
    label,
    normalizedLabel: label,
    locale: null,
    description: null,
    parentId: null,
    sortOrder: 0,
    status: "active",
    metadata: {},
    source: null,
    sourceId: null,
  };
}

function candidate(value: FieldValue, finalScore: number): ScoredCandidate {
  return {
    value,
    finalScore,
    signals: [makeSignal({ kind: "exact_alias", source: "field_aliases", rawScore: finalScore, weight: 1 })],
  };
}

describe("inference/explain", () => {
  it("emits version 1 contract with winner and bounded alternates", () => {
    const winner = candidate(fv("v-1", "k-1", "L-1"), 0.95);
    const alternates = [candidate(fv("v-2", "k-2", "L-2"), 0.7), candidate(fv("v-3", "k-3", "L-3"), 0.5)];
    const explain = buildExplain({
      fieldKey: "company_industry",
      resolvedFieldKey: "linkedin_industry_codes",
      decision: {
        status: "matched",
        band: "high",
        needsReview: false,
        thresholds: { matched: 0.92, suggested: 0.7 },
        reason: "score>=0.92",
      },
      winner,
      alternates,
      policyDomain: "industry",
      priorDecisionCount: 2,
      lastDecisionAt: "2026-05-01T00:00:00Z",
    });
    expect(explain.version).toBe("1");
    expect(explain.winner?.key).toBe("k-1");
    expect(explain.alternates).toHaveLength(2);
    expect(explain.signals).toHaveLength(1);
    expect(explain.priors.decision_count).toBe(2);
    expect(explain.policy.domain).toBe("industry");
  });

  it("emptyExplain returns unmatched contract", () => {
    const explain = emptyExplain("countries", "countries");
    expect(explain.version).toBe("1");
    expect(explain.winner).toBeNull();
    expect(explain.decision.status).toBe("unmatched");
    expect(explain.alternates).toEqual([]);
  });
});
