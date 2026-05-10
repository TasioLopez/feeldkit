import type { OrgConfigProfileV1 } from "@/lib/api/types";

export type ProfileDiffEntry = {
  section: keyof Omit<OrgConfigProfileV1, "schema" | "manifest">;
  kind: "added" | "removed" | "changed";
  key: string;
  before?: unknown;
  after?: unknown;
};

export function diffProfiles(
  before: OrgConfigProfileV1,
  after: OrgConfigProfileV1,
): ProfileDiffEntry[] {
  const out: ProfileDiffEntry[] = [];

  if (
    before.promotion_settings.default_scope !== after.promotion_settings.default_scope ||
    before.promotion_settings.opt_out_global_propose !== after.promotion_settings.opt_out_global_propose ||
    (before.promotion_settings.notes ?? null) !== (after.promotion_settings.notes ?? null)
  ) {
    out.push({
      section: "promotion_settings",
      kind: "changed",
      key: "promotion_settings",
      before: before.promotion_settings,
      after: after.promotion_settings,
    });
  }

  diffByKey(out, "policy_overrides", before.policy_overrides, after.policy_overrides, (row) => row.domain);
  diffByKey(out, "field_locks", before.field_locks, after.field_locks, (row) => row.field_key);
  diffByKey(
    out,
    "flow_pack_overrides",
    before.flow_pack_overrides,
    after.flow_pack_overrides,
    (row) => `${row.flow_key}::${row.action}::${row.ordinal ?? ""}::${row.flow_pack_version ?? ""}`,
  );

  return out;
}

function diffByKey<T>(
  out: ProfileDiffEntry[],
  section: ProfileDiffEntry["section"],
  before: T[],
  after: T[],
  keyOf: (row: T) => string,
): void {
  const beforeMap = new Map(before.map((row) => [keyOf(row), row]));
  const afterMap = new Map(after.map((row) => [keyOf(row), row]));
  for (const [key, row] of afterMap) {
    if (!beforeMap.has(key)) {
      out.push({ section, kind: "added", key, after: row });
    } else if (JSON.stringify(beforeMap.get(key)) !== JSON.stringify(row)) {
      out.push({ section, kind: "changed", key, before: beforeMap.get(key), after: row });
    }
  }
  for (const [key, row] of beforeMap) {
    if (!afterMap.has(key)) {
      out.push({ section, kind: "removed", key, before: row });
    }
  }
}

export function summarizeDiff(diff: ProfileDiffEntry[]): string {
  if (diff.length === 0) return "no changes";
  const counts = diff.reduce(
    (acc, entry) => {
      acc[entry.kind] = (acc[entry.kind] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
  return `${diff.length} changes (${Object.entries(counts)
    .map(([k, v]) => `${v} ${k}`)
    .join(", ")})`;
}
