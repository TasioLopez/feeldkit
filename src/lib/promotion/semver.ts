export type Semver = { major: number; minor: number; patch: number };

export const ZERO_VERSION: Semver = { major: 0, minor: 0, patch: 0 };

export function parseSemver(input: string): Semver | null {
  const parts = input.split(".");
  if (parts.length !== 3) return null;
  const [maj, min, pat] = parts.map((p) => Number(p));
  if (![maj, min, pat].every((n) => Number.isInteger(n) && n >= 0)) return null;
  return { major: maj, minor: min, patch: pat };
}

export function formatSemver(v: Semver): string {
  return `${v.major}.${v.minor}.${v.patch}`;
}

export type BumpKind = "patch" | "minor" | "major";

export function bumpSemver(v: Semver, kind: BumpKind): Semver {
  if (kind === "major") return { major: v.major + 1, minor: 0, patch: 0 };
  if (kind === "minor") return { major: v.major, minor: v.minor + 1, patch: 0 };
  return { major: v.major, minor: v.minor, patch: v.patch + 1 };
}

/**
 * Decide the bump kind for a rollup batch.
 *  - major: any reverts present (breaking the existing seed shape)
 *  - minor: a new target_table appears that wasn't present in any prior version
 *  - patch: otherwise
 */
export function deriveBumpKind(args: {
  hasReverts: boolean;
  newTargetTables: ReadonlySet<string>;
  knownTargetTables: ReadonlySet<string>;
}): BumpKind {
  if (args.hasReverts) return "major";
  for (const t of args.newTargetTables) {
    if (!args.knownTargetTables.has(t)) return "minor";
  }
  return "patch";
}

export function compareSemver(a: Semver, b: Semver): number {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  return a.patch - b.patch;
}
