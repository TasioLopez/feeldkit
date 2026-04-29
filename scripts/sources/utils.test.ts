import { describe, expect, it } from "vitest";
import { toDeterministicKey, uniqueByKey } from "./utils";

describe("source utils", () => {
  it("creates stable deterministic keys", () => {
    expect(toDeterministicKey("Senior Software Engineer")).toBe("senior_software_engineer");
    expect(toDeterministicKey("  C++ / C#  ")).toBe("c_c");
  });

  it("deduplicates values by key and strips empty aliases", () => {
    const values = uniqueByKey([
      { key: "usd", label: "USD", aliases: ["US Dollar", ""] },
      { key: "usd", label: "US Dollar", aliases: ["Dollar"] },
      { key: "", label: "Euro" },
    ]);
    expect(values).toHaveLength(2);
    expect(values[0]?.key).toBe("usd");
    expect(values[0]?.aliases).toEqual(["US Dollar"]);
    expect(values[1]?.key).toBe("euro");
  });
});
