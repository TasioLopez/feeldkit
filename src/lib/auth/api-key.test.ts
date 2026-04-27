import { describe, expect, it } from "vitest";
import { requireScope } from "@/lib/auth/api-key";
import { authenticateApiKey } from "@/lib/auth/api-key-service";

describe("api key auth", () => {
  it("authenticates seeded key", async () => {
    const key = await authenticateApiKey("fk_demo_public_1234567890");
    expect(key).not.toBeNull();
  });

  it("enforces scope checks", async () => {
    const key = await authenticateApiKey("fk_demo_public_1234567890");
    expect(key).not.toBeNull();
    expect(requireScope(key!, "normalize")).toBe(true);
    expect(requireScope(key!, "admin:reviews")).toBe(false);
  });
});
