import { describe, expect, it, vi } from "vitest";
import { rollbackFlowToVersion } from "@/lib/flows/lifecycle";

vi.mock("@/lib/governance/audit", () => ({
  writeAudit: vi.fn(async () => "audit-1"),
}));

describe("flows/lifecycle rollbackFlowToVersion", () => {
  it("returns error when flow pack missing", async () => {
    const admin = {
      from(table: string) {
        if (table === "flow_packs") {
          return {
            select() {
              return {
                eq() {
                  return {
                    maybeSingle: async () => ({ data: null }),
                  };
                },
              };
            },
          };
        }
        return {};
      },
    };
    const res = await rollbackFlowToVersion(admin as never, {
      flowKey: "missing",
      targetVersion: "1.0.0",
      organizationId: null,
      actorId: null,
    });
    expect(res.ok).toBe(false);
    expect(res.error).toBe("flow_not_found");
  });
});
