import { describe, expect, it } from "vitest";
import { applyFlowTransform } from "@/lib/flows/transforms";

describe("flow transforms", () => {
  it("copy preserves the input string", () => {
    expect(applyFlowTransform("hello", { op: "copy" })).toBe("hello");
  });

  it("copy returns null on empty string", () => {
    expect(applyFlowTransform("", { op: "copy" })).toBeNull();
  });

  it("trim removes whitespace and yields null when only whitespace", () => {
    expect(applyFlowTransform("  hi  ", { op: "trim" })).toBe("hi");
    expect(applyFlowTransform("   ", { op: "trim" })).toBeNull();
  });

  it("lower and upper apply case correctly", () => {
    expect(applyFlowTransform("Hi", { op: "lower" })).toBe("hi");
    expect(applyFlowTransform("Hi", { op: "upper" })).toBe("HI");
  });

  it("split_join take=first picks the first part", () => {
    const out = applyFlowTransform("Ada Lovelace", {
      op: "split_join",
      params: { split_on: " ", take: "first" },
    });
    expect(out).toBe("Ada");
  });

  it("split_join take=rest joins remaining parts with provided join", () => {
    const out = applyFlowTransform("Ada Augusta King-Noel", {
      op: "split_join",
      params: { split_on: " ", take: "rest", join: " " },
    });
    expect(out).toBe("Augusta King-Noel");
  });

  it("split_join take=rest returns null for single-token input", () => {
    const out = applyFlowTransform("Cher", {
      op: "split_join",
      params: { split_on: " ", take: "rest" },
    });
    expect(out).toBeNull();
  });

  it("regex_replace substitutes using flags", () => {
    const out = applyFlowTransform("Hello World", {
      op: "regex_replace",
      params: { pattern: "world", replacement: "Earth", flags: "i" },
    });
    expect(out).toBe("Hello Earth");
  });

  it("returns null when the source value is null/undefined", () => {
    expect(applyFlowTransform(null, { op: "copy" })).toBeNull();
    expect(applyFlowTransform(undefined, { op: "trim" })).toBeNull();
  });
});
