import { describe, expect, it } from "vitest";
import type { FlowFieldMapping } from "@/lib/domain/types";
import type { FlowPackOverrideRow } from "@/lib/governance/types";
import { applyFlowMappingOverrides, selectPinnedFlowVersionId } from "@/lib/flows/overrides";

function mapOrd(n: number): FlowFieldMapping {
  return {
    id: `m-${n}`,
    flowPackVersionId: "v1",
    ordinal: n,
    kind: "direct",
    sourceFieldKey: `s${n}`,
    targetFieldKey: `t${n}`,
    transform: { op: "copy" },
    options: {},
    isRequired: false,
    status: "active",
  };
}

describe("flows/overrides", () => {
  it("selectPinnedFlowVersionId picks latest created pin", () => {
    const rows: FlowPackOverrideRow[] = [
      {
        id: "a",
        organizationId: "o",
        flowPackId: "p",
        flowPackVersionId: "v-old",
        ordinal: null,
        action: "pin_version",
        payload: {},
        notes: null,
        createdAt: "2020-01-01T00:00:00Z",
        createdBy: null,
      },
      {
        id: "b",
        organizationId: "o",
        flowPackId: "p",
        flowPackVersionId: "v-new",
        ordinal: null,
        action: "pin_version",
        payload: {},
        notes: null,
        createdAt: "2021-01-01T00:00:00Z",
        createdBy: null,
      },
    ];
    expect(selectPinnedFlowVersionId(rows)).toBe("v-new");
  });

  it("applyFlowMappingOverrides skips and replaces ordinals", () => {
    const mappings = [mapOrd(0), mapOrd(1)];
    const overrides: FlowPackOverrideRow[] = [
      {
        id: "1",
        organizationId: "o",
        flowPackId: "p",
        flowPackVersionId: null,
        ordinal: 0,
        action: "skip",
        payload: {},
        notes: null,
        createdAt: "",
        createdBy: null,
      },
      {
        id: "2",
        organizationId: "o",
        flowPackId: "p",
        flowPackVersionId: null,
        ordinal: 1,
        action: "replace",
        payload: { kind: "direct", sourceFieldKey: "sx", targetFieldKey: "tx" },
        notes: null,
        createdAt: "",
        createdBy: null,
      },
    ];
    const res = applyFlowMappingOverrides(mappings, overrides);
    expect(res.mappings).toHaveLength(1);
    expect(res.mappings[0].ordinal).toBe(1);
    expect(res.mappings[0].sourceFieldKey).toBe("sx");
    expect(res.appliedOverrides).toContain("skip:0");
    expect(res.appliedOverrides).toContain("replace:1");
  });
});
