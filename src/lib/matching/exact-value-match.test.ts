import { describe, expect, it } from "vitest";
import { exactValueMatch, exactValueMatchWithSignals } from "@/lib/matching/exact-value-match";
import { InMemoryFieldRepository } from "@/lib/matching/__fixtures__/in-memory-repo";

describe("exact-value-match", () => {
  it("returns 1.0 for exact label or key match (legacy)", async () => {
    const repo = new InMemoryFieldRepository();
    const type = repo.addType({ key: "currencies" });
    const usd = repo.addValue({ fieldTypeId: type.id, key: "usd", label: "United States Dollar" });
    const result = await exactValueMatch(repo, "currencies", "usd");
    expect(result?.value.id).toBe(usd.id);
    expect(result?.confidence).toBe(1);
  });

  it("emits exact_value signals only on exact match", async () => {
    const repo = new InMemoryFieldRepository();
    const type = repo.addType({ key: "currencies" });
    repo.addValue({ fieldTypeId: type.id, key: "usd", label: "United States Dollar" });
    const candidates = await exactValueMatchWithSignals(repo, "currencies", "United States Dollar");
    expect(candidates).toHaveLength(1);
    expect(candidates[0].signals[0].kind).toBe("exact_value");
    expect(candidates[0].signals[0].rawScore).toBe(1);
    const empty = await exactValueMatchWithSignals(repo, "currencies", "yen");
    expect(empty).toHaveLength(0);
  });
});
