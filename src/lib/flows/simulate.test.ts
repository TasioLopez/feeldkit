import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { simulateFlow, simulationProfileSchema } from "@/lib/flows/simulate";
import { setFlowRepositoryForTesting } from "@/lib/flows/get-flow-repository";
import type { FlowFieldMapping, FlowPack, FlowPackVersion } from "@/lib/domain/types";

function makePack(): FlowPack {
  return {
    id: "pack-1",
    key: "linkedin_salesnav__hubspot",
    name: "LinkedIn → HubSpot",
    description: "",
    sourceSystem: "linkedin_salesnav",
    targetSystem: "hubspot",
    status: "active",
    isSystem: true,
    metadata: {},
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  };
}

function makeVersion(): FlowPackVersion {
  return {
    id: "version-1",
    flowPackId: "pack-1",
    version: "1.0.0",
    changelog: null,
    definition: {},
    sourceSnapshot: {},
    isActive: true,
    lifecycle: "published",
    publishedAt: null,
    retiredAt: null,
    createdAt: "2026-01-01T00:00:00Z",
  };
}

const DIRECT_MAPPING: FlowFieldMapping = {
  id: "m-1",
  flowPackVersionId: "version-1",
  ordinal: 0,
  kind: "direct",
  sourceFieldKey: "full_name",
  targetFieldKey: "fullname",
  transform: { op: "copy" },
  options: {},
  isRequired: true,
  status: "active",
};

describe("simulationProfileSchema", () => {
  it("rejects unknown schema", () => {
    const r = simulationProfileSchema.safeParse({
      schema: "feeldkit.simulation_profile.v0",
      flow_key: "x",
      cases: [{ name: "c", source_record: {} }],
    });
    expect(r.success).toBe(false);
  });

  it("accepts a minimal profile", () => {
    const r = simulationProfileSchema.safeParse({
      schema: "feeldkit.simulation_profile.v1",
      flow_key: "x",
      cases: [{ name: "c", source_record: {} }],
    });
    expect(r.success).toBe(true);
  });
});

describe("simulateFlow", () => {
  beforeEach(() => {
    setFlowRepositoryForTesting({
      listFlows: async () => [makePack()],
      getFlowByKey: async (key: string) => (key === "linkedin_salesnav__hubspot" ? makePack() : null),
      getFlowVersion: async (key: string) =>
        key === "linkedin_salesnav__hubspot"
          ? { pack: makePack(), version: makeVersion(), mappings: [DIRECT_MAPPING] }
          : null,
      getFlowVersionById: async () => null,
      listVersions: async () => [makeVersion()],
    });
  });

  afterEach(() => {
    setFlowRepositoryForTesting(null);
  });

  it("runs a case and reports trace.dry_run=true with persisted_review_count=0", async () => {
    const result = await simulateFlow({
      schema: "feeldkit.simulation_profile.v1",
      flow_key: "linkedin_salesnav__hubspot",
      cases: [{ name: "happy", source_record: { full_name: "Ada" } }],
    });
    expect(result.total_cases).toBe(1);
    expect(result.passed_cases).toBe(1);
    expect(result.trace.dry_run).toBe(true);
    expect(result.trace.persisted_review_count).toBe(0);
    expect(result.cases[0]?.status).toBe("ok");
    expect(result.cases[0]?.fields[0]?.target_field_key).toBe("fullname");
  });

  it("reports failures when expected matched_targets are missing", async () => {
    const result = await simulateFlow({
      schema: "feeldkit.simulation_profile.v1",
      flow_key: "linkedin_salesnav__hubspot",
      cases: [
        {
          name: "with assertions",
          source_record: {},
          expected: { matched_targets: ["fullname"] },
        },
      ],
    });
    expect(result.passed_cases).toBe(0);
    expect(result.cases[0]?.failures.length).toBeGreaterThan(0);
  });

  it("returns 0 cases-passed for an unknown flow_key", async () => {
    const result = await simulateFlow({
      schema: "feeldkit.simulation_profile.v1",
      flow_key: "nonexistent",
      cases: [{ name: "x", source_record: {} }],
    });
    expect(result.cases[0]?.fields).toHaveLength(0);
    expect(result.flow.version).toBe("unknown");
  });

  it("counts would_be_reviews for unmapped fields without persisting", async () => {
    setFlowRepositoryForTesting({
      listFlows: async () => [makePack()],
      getFlowByKey: async () => makePack(),
      getFlowVersion: async () => ({
        pack: makePack(),
        version: makeVersion(),
        mappings: [
          { ...DIRECT_MAPPING, sourceFieldKey: "missing_field", isRequired: true },
        ],
      }),
      getFlowVersionById: async () => null,
      listVersions: async () => [makeVersion()],
    });
    const result = await simulateFlow({
      schema: "feeldkit.simulation_profile.v1",
      flow_key: "linkedin_salesnav__hubspot",
      cases: [{ name: "missing", source_record: {} }],
    });
    expect(result.cases[0]?.would_be_reviews).toBeGreaterThanOrEqual(0);
    expect(result.cases[0]?.status).toBe("incomplete");
  });
});
