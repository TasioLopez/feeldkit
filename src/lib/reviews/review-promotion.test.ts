import { describe, expect, it, vi } from "vitest";
import {
  PROMOTED_ALIAS_ABSENT,
  recordReviewAliasPromotion,
  undoPromotedReviewDecision,
  type FieldAliasRowSnapshot,
} from "@/lib/reviews/review-promotion";

vi.mock("@/lib/governance/audit", () => ({
  writeAudit: vi.fn(async () => "audit-row-1"),
}));

export type PromotionMockSupabase = {
  insertCalls: unknown[];
  updateCalls: { table: string; values: unknown }[];
  deleteCalls: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any;
};

function makeClient(rows: {
  aliasSelectSeq?: (FieldAliasRowSnapshot | null)[];
  promoSelect?: Record<string, unknown> | null;
  promoError?: { message: string } | null;
}): PromotionMockSupabase {
  let aliasIdx = 0;
  const insertCalls: unknown[] = [];
  const updateCalls: { table: string; values: unknown }[] = [];
  const deleteCalls: string[] = [];

  const aliasSelectSeq = rows.aliasSelectSeq ?? [];

  return {
    insertCalls,
    updateCalls,
    deleteCalls,
    from(table: string) {
      if (table === "field_aliases") {
        return {
          select() {
            return {
              eq() {
                return {
                  eq() {
                    return {
                      maybeSingle: async () => {
                        const row = aliasSelectSeq[aliasIdx] ?? null;
                        aliasIdx += 1;
                        return { data: row, error: null };
                      },
                    };
                  },
                };
              },
            };
          },
          delete() {
            return {
              eq(_col: string, id: string) {
                deleteCalls.push(id);
                return { error: null };
              },
            };
          },
          update(values: unknown) {
            updateCalls.push({ table: "field_aliases", values });
            return {
              eq() {
                return { error: null };
              },
            };
          },
        };
      }
      if (table === "promoted_decisions") {
        return {
          select() {
            return {
              eq() {
                return {
                  eq() {
                    return {
                      eq() {
                        return {
                          is() {
                            return {
                              order() {
                                return {
                                  limit() {
                                    return {
                                      maybeSingle: async () => ({
                                        data: rows.promoSelect,
                                        error: rows.promoError ?? null,
                                      }),
                                    };
                                  },
                                };
                              },
                            };
                          },
                        };
                      },
                    };
                  },
                };
              },
            };
          },
          insert(values: unknown) {
            insertCalls.push(values);
            return { error: null };
          },
          update(values: unknown) {
            updateCalls.push({ table: "promoted_decisions", values });
            return {
              eq() {
                return { error: null };
              },
            };
          },
        };
      }
      if (table === "mapping_reviews") {
        return {
          update(values: unknown) {
            updateCalls.push({ table: "mapping_reviews", values });
            return {
              eq() {
                return {
                  eq() {
                    return { error: null };
                  },
                };
              },
            };
          },
        };
      }
      return {};
    },
  };
}

describe("review-promotion", () => {
  it("recordReviewAliasPromotion writes promoted_decisions after alias upsert state", async () => {
    const after: FieldAliasRowSnapshot = {
      id: "alias-1",
      field_value_id: "v-new",
      field_type_id: "t1",
      alias: "hello",
      normalized_alias: "hello",
      locale: null,
      source: "review_approval",
      confidence: 0.95,
      status: "active",
      created_at: "t0",
      updated_at: "t1",
    };
    const client = makeClient({
      aliasSelectSeq: [after],
    });

    await recordReviewAliasPromotion({
      admin: client as never,
      reviewId: "rev-1",
      organizationId: "org-1",
      actorId: "u1",
      fieldTypeId: "t1",
      normalizedAlias: "hello",
      snapshotBefore: PROMOTED_ALIAS_ABSENT,
    });

    expect(client.insertCalls).toHaveLength(1);
    const row = client.insertCalls[0] as Record<string, unknown>;
    expect(row.source_kind).toBe("review");
    expect(row.target_id).toBe("alias-1");
    expect(row.snapshot_before).toEqual(PROMOTED_ALIAS_ABSENT);
  });

  it("undo deletes alias when snapshot was absent", async () => {
    const client = makeClient({
      promoSelect: {
        id: "p1",
        target_table: "field_aliases",
        target_id: "alias-new",
        snapshot_before: PROMOTED_ALIAS_ABSENT,
        organization_id: "org-1",
        reverted_at: null,
      },
    });

    const res = await undoPromotedReviewDecision({
      admin: client as never,
      reviewId: "rev-1",
      organizationId: "org-1",
      actorId: "u1",
    });
    expect(res.ok).toBe(true);
    expect(client.deleteCalls).toEqual(["alias-new"]);
  });

  it("undo restores prior alias row when snapshot exists", async () => {
    const snap: FieldAliasRowSnapshot = {
      id: "alias-1",
      field_value_id: "v-old",
      field_type_id: "t1",
      alias: "bye",
      normalized_alias: "bye",
      locale: null,
      source: "seed",
      confidence: 0.9,
      status: "inactive",
      created_at: "t0",
      updated_at: "t1",
    };
    const client = makeClient({
      promoSelect: {
        id: "p1",
        target_table: "field_aliases",
        target_id: "alias-1",
        snapshot_before: snap,
        organization_id: "org-1",
        reverted_at: null,
      },
    });

    const res = await undoPromotedReviewDecision({
      admin: client as never,
      reviewId: "rev-1",
      organizationId: "org-1",
      actorId: "u1",
    });
    expect(res.ok).toBe(true);
    expect(client.deleteCalls).toHaveLength(0);
    const aliasUpdate = client.updateCalls.find((c: { table: string }) => c.table === "field_aliases");
    expect(aliasUpdate).toBeDefined();
  });
});
