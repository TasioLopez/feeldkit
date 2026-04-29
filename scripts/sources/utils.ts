import { normalizeText } from "../../src/lib/matching/normalize-text";
import type { SeedValue } from "../../src/data/packs/types";

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

export async function safeFetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "feeldkit-importer/1.0" } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function safeFetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "feeldkit-importer/1.0" } });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
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
