import { describe, expect, it, vi, beforeEach } from "vitest";

type InsertCall = {
  table: string;
  values: Record<string, unknown>;
};

const insertCalls: InsertCall[] = [];
let serviceClient: unknown = null;

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServiceClient: () => serviceClient,
}));

import { writeAudit } from "@/lib/governance/audit";

function makeClient(returnId: string | null, errorMessage: string | null = null) {
  return {
    from(table: string) {
      return {
        insert(values: Record<string, unknown>) {
          insertCalls.push({ table, values });
          return {
            select(_columns: string) {
              return {
                async single() {
                  if (errorMessage) {
                    return { data: null, error: { message: errorMessage } };
                  }
                  if (!returnId) {
                    return { data: null, error: null };
                  }
                  return { data: { id: returnId }, error: null };
                },
              };
            },
          };
        },
      };
    },
  };
}

describe("governance/audit.writeAudit", () => {
  beforeEach(() => {
    insertCalls.length = 0;
    serviceClient = null;
  });

  it("returns null when service-role client is unavailable", async () => {
    serviceClient = null;
    const id = await writeAudit({
      organizationId: "org-1",
      actorId: "user-1",
      action: "review.approve",
      entityType: "mapping_reviews",
      entityId: "rev-1",
      before: { status: "pending" },
      after: { status: "approved" },
    });
    expect(id).toBeNull();
    expect(insertCalls).toHaveLength(0);
  });

  it("inserts an audit_logs row with all the expected fields", async () => {
    serviceClient = makeClient("audit-id-123");
    const id = await writeAudit({
      organizationId: "org-1",
      actorId: "user-1",
      action: "policy.update",
      entityType: "org_policy_overrides",
      entityId: "override-7",
      before: { matched: 0.9, suggested: 0.65 },
      after: { matched: 0.95, suggested: 0.75 },
    });
    expect(id).toBe("audit-id-123");
    expect(insertCalls).toHaveLength(1);
    expect(insertCalls[0].table).toBe("audit_logs");
    expect(insertCalls[0].values).toEqual({
      organization_id: "org-1",
      actor_id: "user-1",
      action: "policy.update",
      entity_type: "org_policy_overrides",
      entity_id: "override-7",
      before: { matched: 0.9, suggested: 0.65 },
      after: { matched: 0.95, suggested: 0.75 },
    });
  });

  it("returns null when insert fails", async () => {
    serviceClient = makeClient(null, "permission denied");
    const id = await writeAudit({
      organizationId: null,
      actorId: null,
      action: "review.undo",
      entityType: "mapping_reviews",
      entityId: "rev-1",
    });
    expect(id).toBeNull();
  });

  it("normalizes missing before/after to null payloads", async () => {
    serviceClient = makeClient("a-1");
    await writeAudit({
      organizationId: "org-1",
      actorId: null,
      action: "review.reject",
      entityType: "mapping_reviews",
      entityId: "rev-2",
    });
    expect(insertCalls[0].values.before).toBeNull();
    expect(insertCalls[0].values.after).toBeNull();
  });
});
