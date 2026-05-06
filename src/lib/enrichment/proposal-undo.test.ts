import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/governance/audit", () => ({
  writeAudit: vi.fn(async () => "audit-row-1"),
}));

const adminMock = {
  // populated per test via setMockAdmin
} as unknown as { from: (name: string) => unknown };

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServiceClient: () => adminMock,
}));

type AnyRow = Record<string, unknown>;

function tableQuery(rows: AnyRow[]) {
  const filters: Array<[string, unknown]> = [];

  function findAll(): AnyRow[] {
    return rows.filter((row) => filters.every(([col, val]) => {
      if (val === null) return row[col] === null || row[col] === undefined;
      return row[col] === val;
    }));
  }

  const builder: Record<string, unknown> = {
    select() {
      return builder;
    },
    eq(col: string, val: unknown) {
      filters.push([col, val]);
      return builder;
    },
    is(col: string, val: unknown) {
      filters.push([col, val]);
      return builder;
    },
    order() {
      return builder;
    },
    limit() {
      return builder;
    },
    maybeSingle: async () => ({ data: findAll()[0] ?? null, error: null }),
    then(resolve: (v: { data: AnyRow[]; error: null }) => unknown) {
      // Allow `await admin.from(...)...select(...)` to resolve to {data, error}.
      return resolve({ data: findAll(), error: null });
    },
    delete() {
      return {
        eq(col: string, val: unknown) {
          for (let i = rows.length - 1; i >= 0; i -= 1) {
            if (rows[i][col] === val) rows.splice(i, 1);
          }
          return { error: null };
        },
      };
    },
    update(payload: AnyRow) {
      return {
        eq(col: string, val: unknown) {
          for (const row of rows) if (row[col] === val) Object.assign(row, payload);
          return {
            eq(col2: string, val2: unknown) {
              for (const row of rows) if (row[col] === val && row[col2] === val2) Object.assign(row, payload);
              return { error: null };
            },
            error: null,
          };
        },
      };
    },
  };
  return builder;
}

function setMockAdmin(initial: Record<string, AnyRow[]>) {
  const tables: Record<string, AnyRow[]> = {
    promoted_decisions: [],
    enrichment_proposals: [],
    field_aliases: [],
    field_values: [],
    org_field_aliases: [],
    org_field_values: [],
    ...initial,
  };
  (adminMock as unknown as { from: (name: string) => unknown; _tables: typeof tables }).from = (name: string) => {
    if (!tables[name]) tables[name] = [];
    return tableQuery(tables[name]);
  };
  (adminMock as unknown as { _tables: typeof tables })._tables = tables;
  return tables;
}

describe("undoPromotedProposalDecision", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns ok=false when no promotion rows exist for the proposal", async () => {
    setMockAdmin({});
    const { undoPromotedProposalDecision } = await import("@/lib/enrichment/proposal-service");
    const res = await undoPromotedProposalDecision({
      proposalId: "p1",
      organizationId: "org-1",
      actorId: "u-1",
    });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/no revertible/i);
  });

  it("reverts org-scoped value+alias rows and flips proposal back to pending", async () => {
    const tables = setMockAdmin({
      org_field_values: [{ id: "v-1", key: "k", label: "L" }],
      org_field_aliases: [{ id: "a-1", alias: "Hi" }],
      promoted_decisions: [
        {
          id: "p-decision-2",
          source_kind: "enrichment_proposal",
          source_id: "p1",
          organization_id: "org-1",
          target_table: "org_field_aliases",
          target_id: "a-1",
          snapshot_before: { absent: true },
          reverted_at: null,
          created_at: "2026-05-06T11:00:00Z",
        },
        {
          id: "p-decision-1",
          source_kind: "enrichment_proposal",
          source_id: "p1",
          organization_id: "org-1",
          target_table: "org_field_values",
          target_id: "v-1",
          snapshot_before: { absent: true },
          reverted_at: null,
          created_at: "2026-05-06T10:00:00Z",
        },
      ],
      enrichment_proposals: [{ id: "p1", organization_id: "org-1", status: "approved" }],
    });

    const { undoPromotedProposalDecision } = await import("@/lib/enrichment/proposal-service");
    const res = await undoPromotedProposalDecision({
      proposalId: "p1",
      organizationId: "org-1",
      actorId: "u-1",
    });
    expect(res.ok).toBe(true);
    expect(tables.org_field_aliases).toHaveLength(0);
    expect(tables.org_field_values).toHaveLength(0);
    expect(tables.enrichment_proposals[0].status).toBe("pending");
    expect(tables.promoted_decisions.every((row) => row.reverted_at)).toBe(true);
  });
});
