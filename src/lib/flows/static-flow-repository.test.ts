import { describe, expect, it } from "vitest";
import { StaticFlowRepository } from "@/lib/flows/static-flow-repository";

describe("StaticFlowRepository", () => {
  it("loads flagship flow from src/data/flows", async () => {
    const repo = new StaticFlowRepository();
    const flows = await repo.listFlows();
    expect(flows.some((flow) => flow.key === "linkedin_salesnav__hubspot")).toBe(true);
  });

  it("returns active version mappings", async () => {
    const repo = new StaticFlowRepository();
    const entry = await repo.getFlowVersion("linkedin_salesnav__hubspot");
    expect(entry).not.toBeNull();
    expect(entry!.mappings.length).toBeGreaterThan(0);
    const ordinals = entry!.mappings.map((mapping) => mapping.ordinal);
    expect(ordinals).toEqual([...ordinals].sort((a, b) => a - b));
  });

  it("returns null for unknown flow key", async () => {
    const repo = new StaticFlowRepository();
    expect(await repo.getFlowByKey("does_not_exist")).toBeNull();
    expect(await repo.getFlowVersion("does_not_exist")).toBeNull();
  });
});
