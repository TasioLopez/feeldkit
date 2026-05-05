import { describe, expect, it } from "vitest";
import { runFlow } from "@/lib/flows/run-flow";
import type { IFlowRepository, FlowVersionWithMappings } from "@/lib/flows/flow-repository.interface";
import type { FlowFieldMapping, FlowPack, FlowPackVersion } from "@/lib/domain/types";
import type { TranslateResponse } from "@/lib/translate/translate-service";

const STATIC_PACK: FlowPack = {
  id: "pack-id",
  key: "demo_flow",
  name: "Demo Flow",
  description: "",
  sourceSystem: "demo_source",
  targetSystem: "demo_target",
  status: "active",
  isSystem: true,
  metadata: {},
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
};

const STATIC_VERSION: FlowPackVersion = {
  id: "version-id",
  flowPackId: STATIC_PACK.id,
  version: "1.0.0",
  changelog: null,
  definition: {},
  sourceSnapshot: {},
  isActive: true,
  lifecycle: "published",
  publishedAt: new Date(0).toISOString(),
  retiredAt: null,
  createdAt: new Date(0).toISOString(),
};

function makeRepo(mappings: FlowFieldMapping[]): IFlowRepository {
  const entry: FlowVersionWithMappings = { pack: STATIC_PACK, version: STATIC_VERSION, mappings };
  return {
    listFlows: async () => [STATIC_PACK],
    getFlowByKey: async (key) => (key === STATIC_PACK.key ? STATIC_PACK : null),
    getFlowVersion: async (key) => (key === STATIC_PACK.key ? entry : null),
    getFlowVersionById: async (id) => (id === STATIC_VERSION.id ? entry : null),
    listVersions: async (key) => (key === STATIC_PACK.key ? [STATIC_VERSION] : []),
  };
}

function makeMapping(partial: Partial<FlowFieldMapping> & Pick<FlowFieldMapping, "kind" | "sourceFieldKey" | "targetFieldKey">): FlowFieldMapping {
  return {
    id: "mapping-id",
    flowPackVersionId: STATIC_VERSION.id,
    ordinal: 0,
    transform: {},
    options: {},
    isRequired: false,
    status: "active",
    ...partial,
  };
}

function emptyExplain(): TranslateResponse["explain"] {
  return {
    version: "1",
    field_key: "x",
    resolved_field_key: "x",
    decision: { status: "unmatched", band: "low", needs_review: true },
    winner: null,
    alternates: [],
    signals: [],
    policy: { domain: "default", thresholds: { matched: 0.9, suggested: 0.65 }, reason: "" },
    priors: { decision_count: 0, last_decision_at: null },
  };
}

describe("runFlow", () => {
  it("returns not_found when flow key is unknown", async () => {
    const repo = makeRepo([]);
    const result = await runFlow({ flow_key: "missing", source_record: {} }, { repo });
    expect(result.status).toBe("not_found");
  });

  it("applies direct copy and split_join transforms", async () => {
    const mappings: FlowFieldMapping[] = [
      makeMapping({
        kind: "direct",
        sourceFieldKey: "full_name",
        targetFieldKey: "firstname",
        transform: { op: "split_join", params: { split_on: " ", take: "first" } },
      }),
      makeMapping({
        ordinal: 1,
        kind: "direct",
        sourceFieldKey: "full_name",
        targetFieldKey: "lastname",
        transform: { op: "split_join", params: { split_on: " ", take: "rest" } },
      }),
    ];
    const repo = makeRepo(mappings);
    const result = await runFlow(
      { flow_key: STATIC_PACK.key, source_record: { full_name: "Ada Lovelace" } },
      { repo },
    );
    expect(result.status).toBe("ok");
    const first = result.fields.find((f) => f.target_field_key === "firstname");
    const last = result.fields.find((f) => f.target_field_key === "lastname");
    expect(first?.value).toBe("Ada");
    expect(last?.value).toBe("Lovelace");
  });

  it("skips translate mappings when source value is missing", async () => {
    const mappings: FlowFieldMapping[] = [
      makeMapping({ kind: "translate", sourceFieldKey: "company_industry", targetFieldKey: "company_industry" }),
    ];
    const repo = makeRepo(mappings);
    const result = await runFlow(
      { flow_key: STATIC_PACK.key, source_record: {} },
      { repo, translate: async () => ({ candidates: [], status: "unmatched", needs_review: true, from: { field_key: "x", value_id: null, key: null, label: null, confidence: 0 }, trace: { from_resolved_via: null, to_resolved_via: null, fallback_used: null }, explain: emptyExplain() }) },
    );
    expect(result.fields[0]?.status).toBe("skipped");
    expect(result.fields[0]?.reason).toBe("missing_source_value");
  });

  it("marks translate result as matched when crosswalk produces a deterministic candidate", async () => {
    const mappings: FlowFieldMapping[] = [
      makeMapping({ kind: "translate", sourceFieldKey: "company_industry", targetFieldKey: "company_industry" }),
    ];
    const repo = makeRepo(mappings);
    const fakeTranslate = async (): Promise<TranslateResponse> => ({
      status: "matched",
      needs_review: false,
      from: { field_key: "company_industry", value_id: "v1", key: "computer-software", label: "Computer Software", confidence: 1 },
      candidates: [
        {
          to_value_id: "v2",
          key: "naics_5415",
          label: "Computer Systems Design",
          score: 0.99,
          via: "crosswalk",
          source: "test",
        },
      ],
      trace: { from_resolved_via: null, to_resolved_via: null, fallback_used: null },
      explain: emptyExplain(),
    });
    const result = await runFlow(
      { flow_key: STATIC_PACK.key, source_record: { company_industry: "Computer Software" } },
      { repo, translate: fakeTranslate },
    );
    expect(result.fields[0]?.status).toBe("matched");
    expect(result.fields[0]?.value).toBe("naics_5415");
    expect(result.fields[0]?.confidence).toBeCloseTo(0.99);
  });

  it("downgrades non-deterministic translate hits to unmapped when require_deterministic", async () => {
    const mappings: FlowFieldMapping[] = [
      makeMapping({
        kind: "translate",
        sourceFieldKey: "company_industry",
        targetFieldKey: "company_industry",
        options: { require_deterministic: true, min_confidence: 0.95 },
      }),
    ];
    const repo = makeRepo(mappings);
    const fakeTranslate = async (): Promise<TranslateResponse> => ({
      status: "suggested",
      needs_review: true,
      from: { field_key: "x", value_id: "v1", key: "k", label: "k", confidence: 0.7 },
      candidates: [
        // Mark the candidate as a non-deterministic via using a value the runtime treats as such.
        // The runtime treats anything other than crosswalk/exact_value/concept_graph as non-deterministic.
        { to_value_id: "v2", key: "soft", label: "Software", score: 0.7, via: "crosswalk" as never, source: null },
      ],
      trace: { from_resolved_via: null, to_resolved_via: null, fallback_used: null },
      explain: emptyExplain(),
    });
    const fakeTranslateWithFuzzyVia = async (): Promise<TranslateResponse> => ({
      status: "suggested",
      needs_review: true,
      from: { field_key: "x", value_id: "v1", key: "k", label: "k", confidence: 0.7 },
      candidates: [
        { to_value_id: "v2", key: "soft", label: "Software", score: 0.7, via: "fuzzy" as never, source: null },
      ],
      trace: { from_resolved_via: null, to_resolved_via: null, fallback_used: null },
      explain: emptyExplain(),
    });
    const result = await runFlow(
      { flow_key: STATIC_PACK.key, source_record: { company_industry: "Software-y" } },
      { repo, translate: fakeTranslateWithFuzzyVia },
    );
    expect(result.fields[0]?.status).toBe("unmapped");
    expect(result.fields[0]?.reason).toContain("non_deterministic_path");
    // Sanity check unused mock
    expect(typeof fakeTranslate).toBe("function");
  });

  it("flags below_min_confidence when crosswalk score is too low", async () => {
    const mappings: FlowFieldMapping[] = [
      makeMapping({
        kind: "translate",
        sourceFieldKey: "company_industry",
        targetFieldKey: "company_industry",
        options: { require_deterministic: true, min_confidence: 0.95 },
      }),
    ];
    const repo = makeRepo(mappings);
    const fakeTranslate = async (): Promise<TranslateResponse> => ({
      status: "suggested",
      needs_review: true,
      from: { field_key: "x", value_id: "v1", key: "k", label: "k", confidence: 0.5 },
      candidates: [
        { to_value_id: "v2", key: "soft", label: "Software", score: 0.5, via: "crosswalk", source: "test" },
      ],
      trace: { from_resolved_via: null, to_resolved_via: null, fallback_used: null },
      explain: emptyExplain(),
    });
    const result = await runFlow(
      { flow_key: STATIC_PACK.key, source_record: { company_industry: "Software" } },
      { repo, translate: fakeTranslate },
    );
    expect(result.fields[0]?.status).toBe("unmapped");
    expect(result.fields[0]?.reason).toBe("below_min_confidence:0.95");
  });
});
