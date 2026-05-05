import type { FlowFieldMapping } from "@/lib/domain/types";
import type { FlowPackOverrideRow } from "@/lib/governance/types";

export type FlowMappingOverrideResult = {
  mappings: FlowFieldMapping[];
  appliedOverrides: string[];
};

/** Latest pin wins when multiple rows exist (avoid nondeterminism). */
export function selectPinnedFlowVersionId(overrides: FlowPackOverrideRow[]): string | null {
  const pins = overrides.filter((o) => o.action === "pin_version" && o.flowPackVersionId);
  if (pins.length === 0) return null;
  const sorted = [...pins].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const last = sorted[sorted.length - 1];
  return last.flowPackVersionId;
}

/**
 * Apply skip/replace/lock overrides to denormalized mappings loaded from the DB.
 * `lock` is recorded for observability only — mappings remain unchanged at runtime.
 */
export function applyFlowMappingOverrides(
  mappings: FlowFieldMapping[],
  overrides: FlowPackOverrideRow[],
): FlowMappingOverrideResult {
  const skipOrdinals = new Set<number>();
  const replaceByOrdinal = new Map<number, Record<string, unknown>>();
  const applied: string[] = [];

  for (const row of overrides) {
    if (row.action === "pin_version") continue;
    const ord = row.ordinal;
    if (ord === null || ord === undefined) continue;

    if (row.action === "skip") {
      skipOrdinals.add(ord);
      applied.push(`skip:${ord}`);
    } else if (row.action === "replace") {
      replaceByOrdinal.set(ord, row.payload ?? {});
      applied.push(`replace:${ord}`);
    } else if (row.action === "lock") {
      applied.push(`lock:${ord}`);
    }
  }

  let next = mappings.filter((m) => !skipOrdinals.has(m.ordinal));
  next = next.map((m) => {
    const payload = replaceByOrdinal.get(m.ordinal);
    if (!payload || typeof payload !== "object") return m;
    const partial = payload as Partial<FlowFieldMapping>;
    return {
      ...m,
      ...partial,
      id: m.id,
      flowPackVersionId: m.flowPackVersionId,
      ordinal: m.ordinal,
    };
  });

  return { mappings: next, appliedOverrides: applied };
}

export function appliedOverridesForOrdinal(applied: string[], ordinal: number): string[] {
  const suf = `:${ordinal}`;
  return applied.filter((line) => line.endsWith(suf));
}
