import { describe, expect, it } from "vitest";
import { buildGlobalSystemNodes, inferNaicsToGlobalEdges } from "../../../scripts/sources/industry-global-systems-source";

describe("industry global system source", () => {
  it("builds baseline nodes across multiple systems", () => {
    const nodes = buildGlobalSystemNodes();
    const systems = new Set(nodes.map((node) => node.codeSystem));
    expect(systems.has("nace")).toBe(true);
    expect(systems.has("isic")).toBe(true);
    expect(systems.has("sic")).toBe(true);
    expect(systems.has("gics")).toBe(true);
    expect(nodes.length).toBeGreaterThan(20);
  });

  it("infers related edges from token overlap", () => {
    const edges = inferNaicsToGlobalEdges(
      [
        {
          codeSystem: "naics",
          code: "524126",
          label: "Direct Property and Casualty Insurance Carriers",
          hierarchyPath: "524126",
          parentCode: "52412",
          status: "active",
          metadata: {},
        },
      ],
      buildGlobalSystemNodes(),
    );
    expect(edges.length).toBeGreaterThan(0);
    expect(edges[0]?.fromSystem).toBe("naics");
  });
});
