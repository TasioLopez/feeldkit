import { describe, expect, it } from "vitest";
import {
  bumpSemver,
  compareSemver,
  deriveBumpKind,
  formatSemver,
  parseSemver,
  ZERO_VERSION,
} from "@/lib/promotion/semver";

describe("semver helpers", () => {
  it("parses and formats", () => {
    expect(parseSemver("1.2.3")).toEqual({ major: 1, minor: 2, patch: 3 });
    expect(formatSemver({ major: 4, minor: 0, patch: 1 })).toBe("4.0.1");
  });

  it("rejects bad input", () => {
    expect(parseSemver("abc")).toBeNull();
    expect(parseSemver("1.2")).toBeNull();
    expect(parseSemver("1.-1.0")).toBeNull();
  });

  it("bumps correctly", () => {
    expect(bumpSemver(ZERO_VERSION, "patch")).toEqual({ major: 0, minor: 0, patch: 1 });
    expect(bumpSemver({ major: 1, minor: 5, patch: 9 }, "minor")).toEqual({ major: 1, minor: 6, patch: 0 });
    expect(bumpSemver({ major: 1, minor: 5, patch: 9 }, "major")).toEqual({ major: 2, minor: 0, patch: 0 });
  });

  it("derives bump kind", () => {
    expect(
      deriveBumpKind({
        hasReverts: true,
        newTargetTables: new Set(["field_aliases"]),
        knownTargetTables: new Set(["field_aliases"]),
      }),
    ).toBe("major");
    expect(
      deriveBumpKind({
        hasReverts: false,
        newTargetTables: new Set(["field_crosswalks"]),
        knownTargetTables: new Set(["field_aliases"]),
      }),
    ).toBe("minor");
    expect(
      deriveBumpKind({
        hasReverts: false,
        newTargetTables: new Set(["field_aliases"]),
        knownTargetTables: new Set(["field_aliases"]),
      }),
    ).toBe("patch");
  });

  it("compares", () => {
    expect(compareSemver({ major: 1, minor: 0, patch: 0 }, { major: 0, minor: 9, patch: 9 })).toBeGreaterThan(0);
    expect(compareSemver({ major: 1, minor: 2, patch: 3 }, { major: 1, minor: 2, patch: 3 })).toBe(0);
  });
});
