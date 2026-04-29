import { describe, expect, it } from "vitest";
import { buildPeopleTypologyJobsPack } from "./people-typology-source";

describe("people typology source", () => {
  it("builds a jobs pack with broad filter coverage", () => {
    const pack = buildPeopleTypologyJobsPack();
    expect(pack.key).toBe("jobs");
    expect(pack.fieldTypes.length).toBeGreaterThanOrEqual(9);

    const functionType = pack.fieldTypes.find((fieldType) => fieldType.key === "job_functions");
    const seniorityType = pack.fieldTypes.find((fieldType) => fieldType.key === "seniority_bands");
    const titleType = pack.fieldTypes.find((fieldType) => fieldType.key === "normalized_job_titles");

    expect(functionType?.values.length).toBeGreaterThan(20);
    expect(seniorityType?.values.length).toBeGreaterThanOrEqual(10);
    expect(titleType?.values.length).toBeGreaterThan(10);
  });
});
