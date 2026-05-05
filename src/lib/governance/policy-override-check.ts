/** Mirrors DB constraint + verify-pack-health gate for org_policy_overrides rows. */
export function orgPolicyOverrideRowConsistent(matched: unknown, suggested: unknown): boolean {
  const m = typeof matched === "number" ? matched : Number(matched);
  const s = typeof suggested === "number" ? suggested : Number(suggested);
  if (!Number.isFinite(m) || !Number.isFinite(s)) return false;
  return m > s && m <= 1 && s >= 0;
}
