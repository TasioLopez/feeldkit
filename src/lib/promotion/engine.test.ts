import { describe, expect, it } from "vitest";
import { applyPromotion, revertPromotion } from "@/lib/promotion/engine";
import { ABSENT_SNAPSHOT } from "@/lib/promotion/types";

type AnyRow = Record<string, unknown>;

function tableQuery(rows: AnyRow[]) {
  const filters: Array<[string, unknown]> = [];

  function findFirst(): AnyRow | null {
    return rows.find((row) => filters.every(([col, val]) => row[col] === val)) ?? null;
  }

  const builder: Record<string, unknown> = {
    eq(col: string, val: unknown) {
      filters.push([col, val]);
      return builder;
    },
    select() {
      return builder;
    },
    maybeSingle: async () => ({ data: findFirst(), error: null }),
    single: async () => {
      const row = findFirst();
      return { data: row, error: row ? null : { message: "not_found" } };
    },
    upsert(payload: AnyRow, opts: { onConflict: string }) {
      const cols = opts.onConflict.split(",").map((c) => c.trim());
      const matchIdx = rows.findIndex((row) => cols.every((c) => row[c] === payload[c]));
      if (matchIdx >= 0) {
        rows[matchIdx] = { ...rows[matchIdx], ...payload };
      } else {
        rows.push({ id: `id-${rows.length + 1}`, ...payload });
      }
      const matched = rows.find((row) => cols.every((c) => row[c] === payload[c])) ?? null;
      return {
        select() {
          return {
            single: async () => ({ data: matched, error: null }),
          };
        },
      };
    },
    update(payload: AnyRow) {
      return {
        eq(col: string, val: unknown) {
          const idx = rows.findIndex((row) => row[col] === val);
          if (idx >= 0) {
            rows[idx] = { ...rows[idx], ...payload };
          }
          return { error: null };
        },
      };
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
  };
  return builder;
}

function makeStubAdmin(initial: Record<string, AnyRow[]> = {}) {
  const tables: Record<string, AnyRow[]> = {
    org_field_aliases: [],
    field_aliases: [],
    org_field_values: [],
    field_values: [],
    org_field_crosswalks: [],
    field_crosswalks: [],
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

describe("applyPromotion", () => {
  it("upserts an alias into org_field_aliases under scope='org'", async () => {
    const admin = makeStubAdmin();
    const res = await applyPromotion({
      admin: admin as never,
      scope: "org",
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
    expect(res.ok).toBe(true);
    expect(res.scope).toBe("org");
    expect(res.resolvedTable).toBe("org_field_aliases");
    expect(res.snapshotBefore).toEqual(ABSENT_SNAPSHOT);
    expect(admin._tables.org_field_aliases).toHaveLength(1);
    expect(admin._tables.field_aliases).toHaveLength(0);
  });

  it("upserts an org alias that points at an org-scoped value", async () => {
    const admin = makeStubAdmin();
    const res = await applyPromotion({
      admin: admin as never,
      scope: "org",
      organizationId: "org-1",
      actorId: "u-1",
      payload: {
        target: "field_aliases",
        fieldTypeId: "ft-1",
        orgFieldValueId: "org-v-1",
        alias: "Org local",
        normalizedAlias: "org local",
      },
    });
    expect(res.ok).toBe(true);
    expect(admin._tables.org_field_aliases[0].field_value_id).toBeNull();
    expect(admin._tables.org_field_aliases[0].org_field_value_id).toBe("org-v-1");
  });

  it("rejects org aliases with both global and org-scoped value references", async () => {
    const admin = makeStubAdmin();
    const res = await applyPromotion({
      admin: admin as never,
      scope: "org",
      organizationId: "org-1",
      actorId: "u-1",
      payload: {
        target: "field_aliases",
        fieldTypeId: "ft-1",
        fieldValueId: "fv-1",
        orgFieldValueId: "org-v-1",
        alias: "Bad",
        normalizedAlias: "bad",
      },
    });
    expect(res.ok).toBe(false);
    expect(res.error).toBe("org_alias_requires_exactly_one_value_ref");
  });

  it("upserts an alias into field_aliases under scope='global'", async () => {
    const admin = makeStubAdmin();
    const res = await applyPromotion({
      admin: admin as never,
      scope: "global",
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
    expect(res.ok).toBe(true);
    expect(res.resolvedTable).toBe("field_aliases");
    expect(admin._tables.field_aliases).toHaveLength(1);
    expect(admin._tables.org_field_aliases).toHaveLength(0);
  });

  it("upserts a field_values payload into org_field_values under scope='org'", async () => {
    const admin = makeStubAdmin();
    const res = await applyPromotion({
      admin: admin as never,
      scope: "org",
      organizationId: "org-1",
      actorId: "u-1",
      payload: {
        target: "field_values",
        fieldTypeId: "ft-1",
        key: "custom_key",
        label: "Custom",
        normalizedLabel: "custom",
      },
    });
    expect(res.ok).toBe(true);
    expect(res.resolvedTable).toBe("org_field_values");
    expect(admin._tables.org_field_values).toHaveLength(1);
  });

  it("upserts a field_crosswalks payload into field_crosswalks under scope='global'", async () => {
    const admin = makeStubAdmin();
    const res = await applyPromotion({
      admin: admin as never,
      scope: "global",
      organizationId: "org-1",
      actorId: "u-1",
      payload: {
        target: "field_crosswalks",
        fromFieldTypeId: "from-t",
        fromValueId: "from-v",
        toFieldTypeId: "to-t",
        toValueId: "to-v",
        crosswalkType: "country_default_currency",
      },
    });
    expect(res.ok).toBe(true);
    expect(res.resolvedTable).toBe("field_crosswalks");
    expect(admin._tables.field_crosswalks).toHaveLength(1);
  });
});

describe("revertPromotion", () => {
  it("deletes the row when snapshot was absent", async () => {
    const admin = makeStubAdmin({ org_field_aliases: [{ id: "row-1", alias: "Hi" }] });
    const res = await revertPromotion({
      admin: admin as never,
      resolvedTable: "org_field_aliases",
      targetId: "row-1",
      snapshotBefore: ABSENT_SNAPSHOT,
    });
    expect(res.ok).toBe(true);
    expect(admin._tables.org_field_aliases).toHaveLength(0);
  });

  it("restores prior row when snapshot present", async () => {
    const admin = makeStubAdmin({
      field_aliases: [{ id: "row-1", alias: "new", confidence: 0.99 }],
    });
    const res = await revertPromotion({
      admin: admin as never,
      resolvedTable: "field_aliases",
      targetId: "row-1",
      snapshotBefore: { id: "row-1", alias: "old", confidence: 0.5, status: "active" },
    });
    expect(res.ok).toBe(true);
    expect(admin._tables.field_aliases[0].alias).toBe("old");
    expect(admin._tables.field_aliases[0].confidence).toBe(0.5);
  });
});
