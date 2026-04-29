import { describe, expect, it } from "vitest";
import { suggestPackEnrichments } from "@/lib/ai/pack-enricher";

describe("pack enricher", () => {
  it("falls back to heuristic suggestions without external AI provider", async () => {
    const originalKey = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    const result = await suggestPackEnrichments({
      fieldKey: "practical_industry",
      fieldName: "Practical Industry",
      input: "BioTech",
      existingLabels: ["SaaS", "FinTech"],
      limit: 3,
    });
    expect(result.provider).toBe("heuristic");
    expect(result.suggestions.length).toBeGreaterThan(0);
    expect(result.suggestions[0]?.label).toBe("Biotech");
    if (originalKey) {
      process.env.OPENAI_API_KEY = originalKey;
    }
  });
});
