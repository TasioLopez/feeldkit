import { describe, expect, it } from "vitest";
import { crosswalkMatch, crosswalkMatchWithSignals } from "@/lib/matching/crosswalk-match";
import { InMemoryFieldRepository } from "@/lib/matching/__fixtures__/in-memory-repo";

function setup() {
  const repo = new InMemoryFieldRepository();
  const fromType = repo.addType({ key: "from_field" });
  const toType = repo.addType({ key: "to_field" });
  const fromValue = repo.addValue({ fieldTypeId: fromType.id, key: "src-1", label: "Src 1" });
  const toValue = repo.addValue({ fieldTypeId: toType.id, key: "tgt-1", label: "Tgt 1" });
  repo.addCrosswalk({
    fromFieldTypeId: fromType.id,
    fromValueId: fromValue.id,
    toFieldTypeId: toType.id,
    toValueId: toValue.id,
    crosswalkType: "equivalent_to",
    confidence: 0.85,
    source: "test",
  });
  return { repo, fromType, toType, fromValue, toValue };
}

describe("crosswalk-match", () => {
  it("legacy: returns first crosswalk target", async () => {
    const { repo, toValue } = setup();
    const result = await crosswalkMatch(repo, "from_field", "src-1");
    expect(result?.value.id).toBe(toValue.id);
    expect(result?.confidence).toBeCloseTo(0.85);
  });

  it("emits crosswalk signal pointing to row id", async () => {
    const { repo } = setup();
    const candidates = await crosswalkMatchWithSignals(repo, "from_field", "src-1");
    expect(candidates).toHaveLength(1);
    expect(candidates[0].signals[0].kind).toBe("crosswalk");
    expect(candidates[0].signals[0].ref?.table).toBe("field_crosswalks");
  });
});
