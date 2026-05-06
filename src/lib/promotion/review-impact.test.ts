import { describe, expect, it } from "vitest";
import { fetchReviewPromotionImpacts } from "@/lib/promotion/review-impact";

type AnyRow = Record<string, unknown>;

function makeAdmin(tables: Record<string, AnyRow[]>) {
  return {
    from(name: string) {
      const allRows = tables[name] ?? [];
      const filters: Array<["eq" | "in", string, unknown]> = [];
      const builder = {
        select() {
          return builder;
        },
        eq(col: string, val: unknown) {
          filters.push(["eq", col, val]);
          return builder;
        },
        in(col: string, vals: unknown[]) {
          filters.push(["in", col, vals]);
          return builder;
        },
        then(onFulfilled: (v: { data: AnyRow[]; error: null }) => unknown) {
          let out = [...allRows];
          for (const [op, col, val] of filters) {
            if (op === "eq") {
              out = out.filter((r) => r[col] === val);
            } else {
              const set = val as unknown[];
              out = out.filter((r) => set.includes(r[col]));
            }
          }
          return Promise.resolve(onFulfilled({ data: out, error: null }));
        },
      };
      return builder;
    },
  };
}

describe("fetchReviewPromotionImpacts", () => {
  it("aggregates proposal statuses and registry flag", async () => {
    const tables: Record<string, AnyRow[]> = {
      promotion_proposals: [
        { source_kind: "review", organization_id: "org-1", source_id: "r1", status: "approved_org" },
        { source_kind: "review", organization_id: "org-1", source_id: "r1", status: "pending_global" },
      ],
      promoted_decisions: [
        { id: "d1", source_kind: "review", organization_id: "org-1", source_id: "r1" },
      ],
      promoted_intelligence_entries: [{ promoted_decision_id: "d1" }],
    };
    const admin = makeAdmin(tables);
    const map = await fetchReviewPromotionImpacts(admin as never, "org-1", ["r1"]);
    expect(map.get("r1")?.proposalStatuses.sort()).toEqual(["approved_org", "pending_global"].sort());
    expect(map.get("r1")?.inRegistry).toBe(true);
  });
});
