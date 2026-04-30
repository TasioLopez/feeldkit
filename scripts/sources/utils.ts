import { normalizeText } from "../../src/lib/matching/normalize-text";
import type { SeedValue } from "../../src/data/packs/types";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

export function toDeterministicKey(label: string): string {
  return normalizeText(label).replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "").slice(0, 120);
}

export function uniqueByKey(values: SeedValue[]): SeedValue[] {
  const deduped = new Map<string, SeedValue>();
  for (const value of values) {
    const key = value.key || toDeterministicKey(value.label);
    if (!key || !value.label?.trim()) continue;
    if (!deduped.has(key)) {
      deduped.set(key, {
        ...value,
        key,
        label: value.label.trim(),
        aliases: [...new Set((value.aliases ?? []).map((item) => item.trim()).filter(Boolean))],
      });
    }
  }
  return [...deduped.values()];
}

export type SourceMode = "network" | "snapshot";
export type SourceErrorKind = "http" | "timeout" | "network" | "snapshot_missing" | "unknown";

export type SourceFetchDiagnostics = {
  source_mode: SourceMode;
  url: string;
  ok: boolean;
  status: number | null;
  attempts: number;
  duration_ms: number;
  error_kind: SourceErrorKind | null;
  error_message: string | null;
  payload_sha256: string | null;
  payload_bytes: number;
  snapshot_version: string | null;
};

export type SourceFetchResult = {
  diagnostics: SourceFetchDiagnostics;
  text: string | null;
};

const DEFAULT_FETCH_TIMEOUT_MS = 12000;
const DEFAULT_MAX_ATTEMPTS = 3;
const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

function hashPayload(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function toSourceFetchResult(
  diagnostics: SourceFetchDiagnostics,
  text: string | null,
): SourceFetchResult {
  return { diagnostics, text };
}

function classifyFetchError(error: unknown): Pick<SourceFetchDiagnostics, "error_kind" | "error_message"> {
  if (error instanceof Error && error.name === "AbortError") {
    return { error_kind: "timeout", error_message: "request timed out" };
  }
  if (error instanceof Error) {
    return { error_kind: "network", error_message: error.message };
  }
  return { error_kind: "unknown", error_message: String(error) };
}

export async function fetchTextWithDiagnostics(
  url: string,
  options?: { timeoutMs?: number; maxAttempts?: number },
): Promise<SourceFetchResult> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;
  const maxAttempts = Math.max(1, options?.maxAttempts ?? DEFAULT_MAX_ATTEMPTS);
  const startedAt = Date.now();
  let attempts = 0;
  let lastStatus: number | null = null;
  let lastError: Pick<SourceFetchDiagnostics, "error_kind" | "error_message"> | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    attempts = attempt;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "feeldkit-importer/1.0" },
        signal: controller.signal,
      });
      clearTimeout(timer);
      lastStatus = res.status;
      if (!res.ok) {
        lastError = { error_kind: "http", error_message: `HTTP ${res.status}` };
        if (attempt < maxAttempts && RETRYABLE_STATUSES.has(res.status)) {
          continue;
        }
        return toSourceFetchResult(
          {
            source_mode: "network",
            url,
            ok: false,
            status: res.status,
            attempts,
            duration_ms: Date.now() - startedAt,
            error_kind: "http",
            error_message: `HTTP ${res.status}`,
            payload_sha256: null,
            payload_bytes: 0,
            snapshot_version: null,
          },
          null,
        );
      }
      const text = await res.text();
      return toSourceFetchResult(
        {
          source_mode: "network",
          url,
          ok: true,
          status: res.status,
          attempts,
          duration_ms: Date.now() - startedAt,
          error_kind: null,
          error_message: null,
          payload_sha256: hashPayload(text),
          payload_bytes: Buffer.byteLength(text, "utf8"),
          snapshot_version: null,
        },
        text,
      );
    } catch (error) {
      clearTimeout(timer);
      const classified = classifyFetchError(error);
      lastError = classified;
      if (attempt < maxAttempts && classified.error_kind !== "unknown") {
        continue;
      }
    }
  }

  return toSourceFetchResult(
    {
      source_mode: "network",
      url,
      ok: false,
      status: lastStatus,
      attempts,
      duration_ms: Date.now() - startedAt,
      error_kind: lastError?.error_kind ?? "unknown",
      error_message: lastError?.error_message ?? "request failed",
      payload_sha256: null,
      payload_bytes: 0,
      snapshot_version: null,
    },
    null,
  );
}

export async function readSnapshotTextWithDiagnostics(
  snapshotPath: string,
  options?: { version?: string },
): Promise<SourceFetchResult> {
  const startedAt = Date.now();
  try {
    const text = await readFile(snapshotPath, "utf8");
    return toSourceFetchResult(
      {
        source_mode: "snapshot",
        url: snapshotPath,
        ok: true,
        status: null,
        attempts: 1,
        duration_ms: Date.now() - startedAt,
        error_kind: null,
        error_message: null,
        payload_sha256: hashPayload(text),
        payload_bytes: Buffer.byteLength(text, "utf8"),
        snapshot_version: options?.version ?? null,
      },
      text,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return toSourceFetchResult(
      {
        source_mode: "snapshot",
        url: snapshotPath,
        ok: false,
        status: null,
        attempts: 1,
        duration_ms: Date.now() - startedAt,
        error_kind: "snapshot_missing",
        error_message: message,
        payload_sha256: null,
        payload_bytes: 0,
        snapshot_version: options?.version ?? null,
      },
      null,
    );
  }
}

export async function safeFetchJson<T>(url: string): Promise<T | null> {
  const result = await fetchTextWithDiagnostics(url);
  if (!result.text) {
    return null;
  }
  try {
    return JSON.parse(result.text) as T;
  } catch {
    return null;
  }
}

export async function safeFetchText(url: string): Promise<string | null> {
  const result = await fetchTextWithDiagnostics(url);
  return result.text;
}

export function validateSeedValues(values: SeedValue[], context: string): void {
  const keys = new Set<string>();
  for (const value of values) {
    if (!value.label?.trim()) {
      throw new Error(`${context}: found empty label`);
    }
    if (!value.key?.trim()) {
      throw new Error(`${context}: found empty key`);
    }
    if (keys.has(value.key)) {
      throw new Error(`${context}: duplicate key ${value.key}`);
    }
    keys.add(value.key);
    for (const alias of value.aliases ?? []) {
      if (!alias.trim()) {
        throw new Error(`${context}: malformed alias for key ${value.key}`);
      }
    }
  }
}
