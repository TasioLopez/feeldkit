import type { FlowTransform } from "@/lib/flows/schema";

/**
 * Apply a deterministic transform to a raw source value. Returns `null` when the
 * transform produced no useful output (empty string, missing input, regex no-match).
 * Errors out (throws) on bad params so the ingest script catches misconfigured flows.
 */
export function applyFlowTransform(value: unknown, transform: FlowTransform | undefined): string | null {
  const op = transform?.op ?? "copy";
  const input = coerceToString(value);
  if (input == null) {
    return null;
  }
  const params = (transform?.params ?? {}) as Record<string, unknown>;
  switch (op) {
    case "copy":
      return input.length === 0 ? null : input;
    case "lower":
      return input.toLowerCase();
    case "upper":
      return input.toUpperCase();
    case "trim": {
      const trimmed = input.trim();
      return trimmed.length === 0 ? null : trimmed;
    }
    case "regex_replace":
      return regexReplace(input, params);
    case "split_join":
      return splitJoin(input, params);
    default: {
      const exhaustive: never = op;
      throw new Error(`Unknown flow transform op: ${exhaustive as string}`);
    }
  }
}

function coerceToString(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "object") return null;
  return String(value);
}

function regexReplace(input: string, params: Record<string, unknown>): string | null {
  const pattern = typeof params.pattern === "string" ? params.pattern : null;
  if (!pattern) {
    throw new Error("regex_replace requires params.pattern (string)");
  }
  const flags = typeof params.flags === "string" ? params.flags : "";
  const replacement = typeof params.replacement === "string" ? params.replacement : "";
  const re = new RegExp(pattern, flags);
  const next = input.replace(re, replacement);
  return next.length === 0 ? null : next;
}

function splitJoin(input: string, params: Record<string, unknown>): string | null {
  const splitOn = typeof params.split_on === "string" ? params.split_on : " ";
  const trim = params.trim !== false;
  const take = typeof params.take === "string" ? params.take : "all";
  const join = typeof params.join === "string" ? params.join : splitOn;

  const rawParts = input.split(splitOn);
  const parts = trim ? rawParts.map((p) => p.trim()).filter((p) => p.length > 0) : rawParts;

  if (parts.length === 0) return null;

  switch (take) {
    case "first":
      return parts[0] ?? null;
    case "last":
      return parts[parts.length - 1] ?? null;
    case "rest": {
      if (parts.length <= 1) return null;
      return parts.slice(1).join(join);
    }
    case "all":
      return parts.join(join);
    default: {
      // numeric index ("0", "1", …)
      const idx = Number(take);
      if (!Number.isFinite(idx)) {
        throw new Error(`split_join: unsupported take='${take}'`);
      }
      const part = parts[idx];
      return typeof part === "string" && part.length > 0 ? part : null;
    }
  }
}
