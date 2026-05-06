import { describe, expect, it } from "vitest";
import {
  DEFAULT_PROMOTION_SETTINGS,
  createPromotionProposal,
  deriveProposalStatusFromScope,
  getOrgPromotionSettings,
  setProposalStatus,
  upsertOrgPromotionSettings,
} from "@/lib/promotion/repository";

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
    in(col: string, values: unknown[]) {
      filters.push([col, values]);
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
      return { error: null };
    },
    insert(payload: AnyRow | AnyRow[]) {
      const items = Array.isArray(payload) ? payload : [payload];
      const inserted = items.map((p) => ({ id: `id-${rows.length + 1}`, ...p }));
      rows.push(...inserted);
      return {
        select() {
          return {
            single: async () => ({ data: inserted[0], error: null }),
          };
        },
      };
    },
    update(payload: AnyRow) {
      return {
        eq(col: string, val: unknown) {
          for (const row of rows) if (row[col] === val) Object.assign(row, payload);
          return { error: null };
        },
      };
    },
  };

  return builder;
}

function makeStubAdmin(initial: Record<string, AnyRow[]> = {}) {
  const tables: Record<string, AnyRow[]> = {
    org_promotion_settings: [],
    promotion_proposals: [],
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

describe("promotion repository", () => {
  it("returns DEFAULT_PROMOTION_SETTINGS when no row exists", async () => {
    const admin = makeStubAdmin();
    const settings = await getOrgPromotionSettings(admin as never, "org-1");
    expect(settings.organizationId).toBe("org-1");
    expect(settings.optOutGlobalPropose).toBe(false);
    expect(settings.defaultScope).toBe("org");
  });

  it("upserts and reads back settings", async () => {
    const admin = makeStubAdmin();
    const r = await upsertOrgPromotionSettings(admin as never, {
      organizationId: "org-1",
      optOutGlobalPropose: true,
      defaultScope: "global",
      notes: "phase5 smoke",
      actorId: "u-1",
    });
    expect(r.ok).toBe(true);
    const after = await getOrgPromotionSettings(admin as never, "org-1");
    expect(after.optOutGlobalPropose).toBe(true);
    expect(after.defaultScope).toBe("global");
  });

  it("createPromotionProposal returns a row with expected status", async () => {
    const admin = makeStubAdmin();
    const proposal = await createPromotionProposal(admin as never, {
      sourceKind: "review",
      sourceId: "rev-1",
      organizationId: "org-1",
      targetTable: "field_aliases",
      payload: { foo: "bar" },
      status: "approved_org",
      auditLogId: "audit-1",
      actorId: "u-1",
    });
    expect(proposal?.status).toBe("approved_org");
    expect(proposal?.targetTable).toBe("field_aliases");
    expect(admin._tables.promotion_proposals).toHaveLength(1);
  });

  it("setProposalStatus updates status and curator_decision_at when terminal", async () => {
    const admin = makeStubAdmin({
      promotion_proposals: [
        {
          id: "p1",
          status: "pending_global",
          source_kind: "review",
          source_id: "rev-1",
          organization_id: "org-1",
          target_table: "field_aliases",
          payload: {},
        },
      ],
    });
    const r = await setProposalStatus(admin as never, {
      proposalId: "p1",
      status: "approved_global",
      curatorId: "platform-admin-1",
    });
    expect(r.ok).toBe(true);
    const updated = admin._tables.promotion_proposals[0];
    expect(updated.status).toBe("approved_global");
    expect(updated.curator_id).toBe("platform-admin-1");
    expect(updated.curator_decision_at).toBeDefined();
  });

  it("deriveProposalStatusFromScope maps scope to status", () => {
    expect(deriveProposalStatusFromScope("org")).toBe("approved_org");
    expect(deriveProposalStatusFromScope("global")).toBe("approved_global");
  });

  it("DEFAULT_PROMOTION_SETTINGS is conservative", () => {
    expect(DEFAULT_PROMOTION_SETTINGS.optOutGlobalPropose).toBe(false);
    expect(DEFAULT_PROMOTION_SETTINGS.defaultScope).toBe("org");
  });
});
