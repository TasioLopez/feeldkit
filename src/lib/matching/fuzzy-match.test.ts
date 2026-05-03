import { describe, expect, it } from "vitest";
import { fuzzyMatch, fuzzyMatchWithSignals } from "@/lib/matching/fuzzy-match";
import { InMemoryFieldRepository } from "@/lib/matching/__fixtures__/in-memory-repo";

describe("fuzzy-match", () => {
  it("returns null below floor (legacy)", async () => {
    const repo = new InMemoryFieldRepository();
    const type = repo.addType({ key: "tech" });
    repo.addValue({ fieldTypeId: type.id, key: "python", label: "Python" });
    expect(await fuzzyMatch(repo, "tech", "zebra unicorn ham")).toBeNull();
  });

  it("returns hit above floor (legacy)", async () => {
    const repo = new InMemoryFieldRepository();
    const type = repo.addType({ key: "jobs" });
    repo.addValue({ fieldTypeId: type.id, key: "software_engineer", label: "Software Engineer" });
    const result = await fuzzyMatch(repo, "jobs", "software engineer");
    expect(result?.value.key).toBe("software_engineer");
  });

  it("emits fuzzy_label and fuzzy_alias signals separately", async () => {
    const repo = new InMemoryFieldRepository();
    const type = repo.addType({ key: "jobs" });
    const value = repo.addValue({ fieldTypeId: type.id, key: "software_engineer", label: "Software Engineer" });
    repo.addAlias({ fieldTypeId: type.id, fieldValueId: value.id, alias: "swe" });
    const candidates = await fuzzyMatchWithSignals(repo, "jobs", "software engineer");
    expect(candidates.length).toBeGreaterThan(0);
    const winner = candidates[0];
    const labelSignals = winner.signals.filter((s) => s.kind === "fuzzy_label");
    expect(labelSignals.length).toBeGreaterThan(0);
  });
});
