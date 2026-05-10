import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { importOrgConfigProfile } from "@/lib/profiles/import";
import type { OrgConfigProfileV1 } from "@/lib/api/types";
import { setFlowRepositoryForTesting } from "@/lib/flows/get-flow-repository";

const auditCalls: Array<Record<string, unknown>> = [];
vi.mock("@/lib/governance/audit", () => ({
  writeAudit: async (args: Record<string, unknown>) => {
    auditCalls.push(args);
    return "audit-mock-id";
  },
}));

type AnyRow = Record<string, unknown>;

function tableQuery(rows: AnyRow[]) {
  const filters: Array<[string, unknown]> = [];
  function findFirst(): AnyRow | null {
    return rows.find((row) => filters.every(([col, val]) => row[col] === val)) ?? null;
  }
  function findAll(): AnyRow[] {
    return rows.filter((row) => filters.every(([col, val]) => row[col] === val));
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
    single: async () => ({ data: findFirst(), error: null }),
    upsert(payload: AnyRow, opts: { onConflict: string }) {
      const cols = opts.onConflict.split(",").map((c) => c.trim());
      const idx = rows.findIndex((row) => cols.every((c) => row[c] === payload[c]));
      if (idx >= 0) rows[idx] = { ...rows[idx], ...payload };
      else rows.push({ id: `id-${rows.length + 1}`, ...payload });
      return { error: null };
    },
    insert(payload: AnyRow | AnyRow[]) {
      const items = Array.isArray(payload) ? payload : [payload];
      const inserted = items.map((p, i) => ({ id: `id-${rows.length + i + 1}`, ...p }));
      rows.push(...inserted);
      return { error: null, select: () => ({ single: async () => ({ data: inserted[0], error: null }) }) };
    },
    delete() {
      return {
        eq(col: string, val: unknown) {
          for (let i = rows.length - 1; i >= 0; i--) {
            if (rows[i]![col] === val) rows.splice(i, 1);
          }
          return { error: null };
        },
      };
    },
    then(resolve: (value: { data: AnyRow[]; error: null }) => unknown) {
      return Promise.resolve({ data: findAll(), error: null }).then(resolve);
    },
  };
  return builder;
}

function makeStubAdmin(initial: Record<string, AnyRow[]> = {}) {
  const tables: Record<string, AnyRow[]> = {
    org_promotion_settings: [],
    org_policy_overrides: [],
    org_field_locks: [],
    flow_pack_overrides: [],
    flow_packs: [],
    flow_pack_versions: [],
    audit_logs: [],
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

const VALID_PROFILE: OrgConfigProfileV1 = {
  schema: "feeldkit.org_config_profile.v1",
  manifest: {
    exported_at: "2026-05-07T19:00:00Z",
    source_organization_id: "src-org",
    feeldkit_app_version: "0.1.0",
    schema_version: 1,
  },
  promotion_settings: {
    default_scope: "org",
    opt_out_global_propose: false,
    notes: null,
  },
  policy_overrides: [
    { domain: "industry", matched: 0.9, suggested: 0.6, notes: null },
    { domain: "geo", matched: 0.95, suggested: 0.7, notes: "geo strict" },
  ],
  field_locks: [{ field_key: "company_country", mode: "require_review", reason: null }],
  flow_pack_overrides: [],
};

describe("importOrgConfigProfile", () => {
  beforeEach(() => {
    auditCalls.length = 0;
    setFlowRepositoryForTesting({
      listFlows: async () => [],
      getFlowByKey: async (key: string) =>
        key === "linkedin_salesnav__hubspot"
          ? {
              id: "pack-1",
              key,
              name: "LinkedIn → HubSpot",
              description: "",
              sourceSystem: "linkedin_salesnav",
              targetSystem: "hubspot",
              status: "active",
              isSystem: true,
              metadata: {},
              createdAt: "2026-01-01T00:00:00Z",
              updatedAt: "2026-01-01T00:00:00Z",
            }
          : null,
      getFlowVersion: async (key: string, version?: string) =>
        key === "linkedin_salesnav__hubspot" && version === "1.0.0"
          ? {
              pack: {
                id: "pack-1",
                key,
                name: "LinkedIn → HubSpot",
                description: "",
                sourceSystem: "linkedin_salesnav",
                targetSystem: "hubspot",
                status: "active",
                isSystem: true,
                metadata: {},
                createdAt: "2026-01-01T00:00:00Z",
                updatedAt: "2026-01-01T00:00:00Z",
              },
              version: {
                id: "version-1",
                flowPackId: "pack-1",
                version: "1.0.0",
                changelog: null,
                definition: {},
                sourceSnapshot: {},
                isActive: true,
                lifecycle: "published",
                publishedAt: null,
                retiredAt: null,
                createdAt: "2026-01-01T00:00:00Z",
              },
              mappings: [],
            }
          : null,
      getFlowVersionById: async () => null,
      listVersions: async () => [],
    });
  });

  afterEach(() => {
    setFlowRepositoryForTesting(null);
    vi.restoreAllMocks();
  });

  it("rejects an unknown schema version", async () => {
    const admin = makeStubAdmin();
    const result = await importOrgConfigProfile(admin as never, {
      organizationId: "tgt-org",
      actorId: "actor-1",
      profile: { ...VALID_PROFILE, schema: "feeldkit.org_config_profile.v0" } as never,
      dryRun: true,
    });
    expect(result.ok).toBe(false);
    expect(result.conflicts[0]?.reason).toMatch(/unsupported_schema/);
  });

  it("dry_run reports planned counts but writes nothing", async () => {
    const admin = makeStubAdmin();
    const result = await importOrgConfigProfile(admin as never, {
      organizationId: "tgt-org",
      actorId: "actor-1",
      profile: VALID_PROFILE,
      dryRun: true,
    });
    expect(result.dry_run).toBe(true);
    expect(result.applied).toEqual({
      promotion_settings: 1,
      policy_overrides: 2,
      field_locks: 1,
      flow_pack_overrides: 0,
    });
    expect(admin._tables.org_policy_overrides).toHaveLength(0);
    expect(admin._tables.org_field_locks).toHaveLength(0);
    expect(admin._tables.org_promotion_settings).toHaveLength(0);
    expect(admin._tables.audit_logs).toHaveLength(0);
  });

  it("apply path writes rows, audit log, and reports applied counts", async () => {
    const admin = makeStubAdmin();
    const result = await importOrgConfigProfile(admin as never, {
      organizationId: "tgt-org",
      actorId: "actor-1",
      profile: VALID_PROFILE,
      dryRun: false,
    });
    expect(result.ok).toBe(true);
    expect(result.dry_run).toBe(false);
    expect(result.applied).toEqual({
      promotion_settings: 1,
      policy_overrides: 2,
      field_locks: 1,
      flow_pack_overrides: 0,
    });
    expect(admin._tables.org_policy_overrides).toHaveLength(2);
    expect(admin._tables.org_field_locks).toHaveLength(1);
    expect(admin._tables.org_promotion_settings).toHaveLength(1);
    expect(auditCalls).toHaveLength(1);
    expect(auditCalls[0]?.action).toBe("profile.import");
    expect(auditCalls[0]?.entityType).toBe("org_config_profile");
    expect(result.audit_id).toBe("audit-mock-id");
  });

  it("flags unknown_domain conflicts and skips the bad row", async () => {
    const admin = makeStubAdmin();
    const profile: OrgConfigProfileV1 = {
      ...VALID_PROFILE,
      policy_overrides: [
        ...VALID_PROFILE.policy_overrides,
        { domain: "unknown_domain", matched: 0.9, suggested: 0.6, notes: null },
      ],
    };
    const result = await importOrgConfigProfile(admin as never, {
      organizationId: "tgt-org",
      actorId: "actor-1",
      profile,
      dryRun: false,
    });
    expect(result.ok).toBe(false);
    expect(result.conflicts.some((c) => c.reason === "unknown_domain")).toBe(true);
    expect(result.applied.policy_overrides).toBe(2);
  });

  it("flags flow_not_found conflicts when the target lacks the flow", async () => {
    const admin = makeStubAdmin();
    const profile: OrgConfigProfileV1 = {
      ...VALID_PROFILE,
      flow_pack_overrides: [
        {
          flow_key: "salesnav__pipedrive",
          flow_pack_version: null,
          ordinal: 1,
          action: "skip",
          payload: {},
          notes: null,
        },
      ],
    };
    const result = await importOrgConfigProfile(admin as never, {
      organizationId: "tgt-org",
      actorId: "actor-1",
      profile,
      dryRun: false,
    });
    expect(result.conflicts.some((c) => c.reason === "flow_not_found")).toBe(true);
    expect(result.applied.flow_pack_overrides).toBe(0);
  });

  it("applies flow overrides when the flow + version exist", async () => {
    const admin = makeStubAdmin();
    const profile: OrgConfigProfileV1 = {
      ...VALID_PROFILE,
      flow_pack_overrides: [
        {
          flow_key: "linkedin_salesnav__hubspot",
          flow_pack_version: "1.0.0",
          ordinal: null,
          action: "pin_version",
          payload: {},
          notes: null,
        },
      ],
    };
    const result = await importOrgConfigProfile(admin as never, {
      organizationId: "tgt-org",
      actorId: "actor-1",
      profile,
      dryRun: false,
    });
    expect(result.ok).toBe(true);
    expect(result.applied.flow_pack_overrides).toBe(1);
    const inserted = admin._tables.flow_pack_overrides[0];
    expect(inserted?.flow_pack_id).toBe("pack-1");
    expect(inserted?.flow_pack_version_id).toBe("version-1");
    expect(inserted?.action).toBe("pin_version");
  });
});
