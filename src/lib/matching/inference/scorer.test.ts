import { describe, expect, it } from "vitest";
import { scoreCandidate, scoreCandidates } from "@/lib/matching/inference/scorer";
import { makeSignal } from "@/lib/matching/inference/signal";
import { DEFAULT_WEIGHTS } from "@/lib/matching/inference/weights";
import type { FieldValue } from "@/lib/domain/types";

function fv(id: string, key = id, metadata: Record<string, unknown> = {}): FieldValue {
  return {
    id,
    fieldTypeId: "ft",
    key,
    label: key,
    normalizedLabel: key,
    locale: null,
    description: null,
    parentId: null,
    sortOrder: 0,
    status: "active",
    metadata,
    source: null,
    sourceId: null,
  };
}

describe("inference/scorer", () => {
  it("uses the strongest base evidence as anchor", () => {
    const result = scoreCandidate({
      value: fv("a"),
      signals: [
        makeSignal({ kind: "fuzzy_label", source: "x", rawScore: 0.6, weight: 1 }),
        makeSignal({ kind: "metadata_code", source: "y", rawScore: 0.97, weight: 1 }),
      ],
    });
    expect(result.finalScore).toBeCloseTo(0.97, 3);
  });

  it("adds bounded soft boosts on top of base evidence", () => {
    const result = scoreCandidate({
      value: fv("a"),
      signals: [
        makeSignal({ kind: "exact_alias", source: "fa", rawScore: 0.9, weight: 1 }),
        makeSignal({ kind: "locale_preference", source: "ctx", rawScore: 1, weight: DEFAULT_WEIGHTS.locale_preference }),
        makeSignal({ kind: "alias_source_trust", source: "review_approval", rawScore: 1, weight: DEFAULT_WEIGHTS.alias_source_trust }),
      ],
    });
    expect(result.finalScore).toBeGreaterThan(0.9);
    expect(result.finalScore).toBeLessThanOrEqual(1);
  });

  it("caps soft boosts so they cannot dominate", () => {
    const result = scoreCandidate({
      value: fv("a"),
      signals: [
        makeSignal({ kind: "exact_alias", source: "fa", rawScore: 0.5, weight: 1 }),
        makeSignal({ kind: "locale_preference", source: "ctx", rawScore: 1, weight: 1 }),
        makeSignal({ kind: "alias_source_trust", source: "manual", rawScore: 1, weight: 1 }),
        makeSignal({ kind: "context_country", source: "ctx", rawScore: 1, weight: 1 }),
      ],
    });
    expect(result.finalScore).toBeLessThanOrEqual(0.5 + 0.15 + 1e-9);
  });

  it("prior_decision contributes a bounded boost when value matches", () => {
    const winner = scoreCandidate({
      value: fv("a"),
      signals: [
        makeSignal({ kind: "fuzzy_label", source: "x", rawScore: 0.8, weight: 1 }),
        makeSignal({ kind: "prior_decision", source: "priors", rawScore: 1, weight: DEFAULT_WEIGHTS.prior_decision }),
      ],
    });
    const loser = scoreCandidate({
      value: fv("b"),
      signals: [makeSignal({ kind: "fuzzy_label", source: "x", rawScore: 0.85, weight: 1 })],
    });
    expect(winner.finalScore).toBeGreaterThan(loser.finalScore);
  });

  it("sorts candidates by final score", () => {
    const ranked = scoreCandidates([
      { value: fv("low"), signals: [makeSignal({ kind: "fuzzy_label", source: "x", rawScore: 0.5, weight: 1 })] },
      { value: fv("high"), signals: [makeSignal({ kind: "exact_value", source: "x", rawScore: 1, weight: 1 })] },
    ]);
    expect(ranked[0].value.key).toBe("high");
    expect(ranked[1].value.key).toBe("low");
  });
});
