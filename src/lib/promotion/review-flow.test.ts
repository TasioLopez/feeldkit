import { describe, expect, it, vi } from "vitest";
import { promoteReviewApproval } from "@/lib/promotion/review-flow";

vi.mock("@/lib/governance/audit", () => ({
  writeAudit: vi.fn(async () => "audit-row-1"),
}));

type AnyRow = Record<string, unknown>;

function tableQuery(rows: AnyRow[]) {
  const filters: Array<[string, unknown]> = [];

  function findFirst(): AnyRow | null {
    return rows.find((row) => filters.every(([col, val]) => row[col] === val)) ?? null;
  }

  const builder: Record<string, unknown> = {
    select() {
      return builder;
    },
    eq(col: string, val: unknown) {
      filters.push([col, val]);
      return builder;
    },
    order() {
      return builder;
    },
    limit() {
      return builder;
    },
    maybeSingle: async () => ({ data: findFirst(), error: null }),
    single: async () => {
      const row = findFirst();
      return { data: row, error: row ? null : { message: "not_found" } };
    },
    upsert(payload: AnyRow, opts: { onConflict: string }) {
      const cols = opts.onConflict.split(",").map((c) => c.trim());
      const idx = rows.findIndex((row) => cols.every((c) => row[c] === payload[c]));
      if (idx >= 0) rows[idx] = { ...rows[idx], ...payload };
      else rows.push({ id: `id-${rows.length + 1}`, ...payload });
      const matched = rows.find((row) => cols.every((c) => row[c] === payload[c])) ?? null;
      return {
        select() {
          return { single: async () => ({ data: matched, error: null }) };
        },
        error: null,
      };
    },
    insert(payload: AnyRow | AnyRow[]) {
      const items = Array.isArray(payload) ? payload : [payload];
      const inserted = items.map((p) => ({ id: `id-${rows.length + 1}`, ...p }));
      rows.push(...inserted);
      return {
        select() {
          return { single: async () => ({ data: inserted[0], error: null }) };
        },
        error: null,
      };
    },
    update(payload: AnyRow) {
      return {
        eq(col: string, val: unknown) {
          const eqChain = {
            eq() {
              return { error: null };
            },
            error: null as unknown,
          };
          for (const row of rows) if (row[col] === val) Object.assign(row, payload);
          return eqChain;
        },
      };
    },
  };
  return builder;
}

function makeAdmin(initial: Record<string, AnyRow[]> = {}) {
  const tables: Record<string, AnyRow[]> = {
    org_field_aliases: [],
    field_aliases: [],
    org_field_values: [],
    field_values: [],
    org_field_crosswalks: [],
    field_crosswalks: [],
    org_promotion_settings: [],
    promotion_proposals: [],
    promoted_decisions: [],
    mapping_reviews: [],
    ...initial,
  };
  return {
    _tables: tables,
    from(name: string) {
      if (!tables[name]) tables[name] = [];
      return tableQuery(tables[name]);
    },
  };
}

describe("promoteReviewApproval", () => {
  it("with default settings: writes to org_field_aliases + approved_org proposal + pending_global proposal", async () => {
    const admin = makeAdmin();
    const out = await promoteReviewApproval({
      admin: admin as never,
      sourceKind: "review",
      sourceId: "rev-1",
      organizationId: "org-1",
      actorId: "u-1",
      payload: {
        target: "field_aliases",
        fieldTypeId: "ft-1",
        fieldValueId: "fv-1",
        alias: "Hi",
        normalizedAlias: "hi",
      },
    });
    expect(out.ok).toBe(true);
    expect(out.scope).toBe("org");
    expect(out.pendingGlobal).toBe(true);
    expect(admin._tables.org_field_aliases).toHaveLength(1);
    expect(admin._tables.field_aliases).toHaveLength(0);

    const statuses = admin._tables.promotion_proposals.map((row) => row.status);
    expect(statuses).toContain("approved_org");
    expect(statuses).toContain("pending_global");
    expect(admin._tables.promoted_decisions).toHaveLength(1);
    const ledger = admin._tables.promoted_decisions[0];
    expect(ledger.target_table).toBe("org_field_aliases");
  });

  it("with default_scope=global and propose enabled: writes directly to field_aliases + approved_global proposal", async () => {
    const admin = makeAdmin({
      org_promotion_settings: [
        {
          organization_id: "org-1",
          opt_out_global_propose: false,
          default_scope: "global",
          updated_at: "2026-01-01",
        },
      ],
    });
    const out = await promoteReviewApproval({
      admin: admin as never,
      sourceKind: "review",
      sourceId: "rev-2",
      organizationId: "org-1",
      actorId: "u-1",
      payload: {
        target: "field_aliases",
        fieldTypeId: "ft-1",
        fieldValueId: "fv-1",
        alias: "Hi",
        normalizedAlias: "hi",
      },
    });
    expect(out.ok).toBe(true);
    expect(out.scope).toBe("global");
    expect(out.pendingGlobal).toBe(false);
    expect(admin._tables.field_aliases).toHaveLength(1);
    const statuses = admin._tables.promotion_proposals.map((r) => r.status);
    expect(statuses).toEqual(["approved_global"]);
  });

  it("with opt_out_global_propose=true: writes only org-scope and skips pending_global", async () => {
    const admin = makeAdmin({
      org_promotion_settings: [
        {
          organization_id: "org-1",
          opt_out_global_propose: true,
          default_scope: "org",
          updated_at: "2026-01-01",
        },
      ],
    });
    const out = await promoteReviewApproval({
      admin: admin as never,
      sourceKind: "review",
      sourceId: "rev-3",
      organizationId: "org-1",
      actorId: "u-1",
      payload: {
        target: "field_aliases",
        fieldTypeId: "ft-1",
        fieldValueId: "fv-1",
        alias: "Hi",
        normalizedAlias: "hi",
      },
    });
    expect(out.ok).toBe(true);
    expect(out.scope).toBe("org");
    expect(out.pendingGlobal).toBe(false);
    const statuses = admin._tables.promotion_proposals.map((r) => r.status);
    expect(statuses).toEqual(["approved_org"]);
  });
});
