import { describe, expect, it } from "vitest";
import { metadataCodeMatch, metadataCodeMatchWithSignals } from "@/lib/matching/metadata-code-match";
import { InMemoryFieldRepository } from "@/lib/matching/__fixtures__/in-memory-repo";

describe("metadata-code-match", () => {
  it("matches iso2 in metadata", async () => {
    const repo = new InMemoryFieldRepository();
    const type = repo.addType({ key: "countries" });
    const nl = repo.addValue({ fieldTypeId: type.id, key: "netherlands", label: "Netherlands", metadata: { iso2: "NL" } });
    const result = await metadataCodeMatch(repo, "countries", "NL");
    expect(result?.value.id).toBe(nl.id);
    expect(result?.confidence).toBe(0.97);
  });

  it("emits metadata_code signal with code reference", async () => {
    const repo = new InMemoryFieldRepository();
    const type = repo.addType({ key: "countries" });
    repo.addValue({ fieldTypeId: type.id, key: "netherlands", label: "Netherlands", metadata: { iso2: "NL" } });
    const candidates = await metadataCodeMatchWithSignals(repo, "countries", "nl");
    expect(candidates).toHaveLength(1);
    expect(candidates[0].signals[0].kind).toBe("metadata_code");
    expect(candidates[0].signals[0].metadata?.code_key).toBe("iso2");
  });
});
