import { describe, expect, it } from "vitest";
import { buildPeopleTypologyJobsPack } from "../../../scripts/sources/people-typology-source";

describe("people typology pack builder", () => {
  it("builds jobs pack with expected core field types", () => {
    const pack = buildPeopleTypologyJobsPack();
    expect(pack.key).toBe("jobs");
    expect(pack.fieldTypes.find((entry) => entry.key === "job_functions")?.values.length).toBeGreaterThanOrEqual(20);
    expect(pack.fieldTypes.find((entry) => entry.key === "seniority_bands")?.values.length).toBeGreaterThanOrEqual(10);
    expect(pack.fieldTypes.find((entry) => entry.key === "normalized_job_titles")?.values.length).toBeGreaterThanOrEqual(20);
  });
});
