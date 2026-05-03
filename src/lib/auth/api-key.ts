import { createHash, timingSafeEqual } from "node:crypto";

export type ApiScope =
  | "read:packs"
  | "read:fields"
  | "normalize"
  | "validate"
  | "parse"
  | "admin:reviews"
  | "admin:fields";

/** Every scope that may be granted to an API key (server validation + dashboard UI). */
export const ALL_API_KEY_SCOPES: readonly ApiScope[] = [
  "read:packs",
  "read:fields",
  "normalize",
  "validate",
  "parse",
  "admin:reviews",
  "admin:fields",
];

/** Default scopes pre-selected in the dashboard when creating a key. */
export const DEFAULT_API_KEY_SCOPES: ApiScope[] = [
  "read:packs",
  "read:fields",
  "normalize",
  "validate",
  "parse",
];

export interface StoredKey {
  id: string;
  organizationId: string | null;
  keyPrefix: string;
  keyHash: string;
  scopes: ApiScope[];
  revokedAt: string | null;
}

interface ParsedApiKey {
  keyPrefix: string;
  clearText: string;
}

const inMemoryKeys: StoredKey[] = [];

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** Must match stored `key_prefix` length (see `generateApiKey` in api-key-service). */
export const API_KEY_PREFIX_LENGTH = 12;

export function parseApiKey(raw: string): ParsedApiKey | null {
  const key = raw.trim();
  if (!key.startsWith("fk_")) {
    return null;
  }
  return { keyPrefix: key.slice(0, API_KEY_PREFIX_LENGTH), clearText: key };
}

export function registerSeedApiKey(rawKey: string, scopes: ApiScope[]): void {
  const parsed = parseApiKey(rawKey);
  if (!parsed) {
    return;
  }
  inMemoryKeys.push({
    id: crypto.randomUUID(),
    organizationId: null,
    keyPrefix: parsed.keyPrefix,
    keyHash: sha256(parsed.clearText),
    scopes,
    revokedAt: null,
  });
}

/** In-memory keys for local/test when DB is not used or as fallback for demo key. */
export function authenticateInMemoryApiKey(rawKey: string): StoredKey | null {
  const parsed = parseApiKey(rawKey);
  if (!parsed) {
    return null;
  }
  const candidate = inMemoryKeys.find((entry) => entry.keyPrefix === parsed.keyPrefix && !entry.revokedAt);
  if (!candidate) {
    return null;
  }
  const left = Buffer.from(candidate.keyHash, "utf8");
  const right = Buffer.from(sha256(parsed.clearText), "utf8");
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    return null;
  }
  return candidate;
}

export function requireScope(storedKey: StoredKey, required: ApiScope): boolean {
  return storedKey.scopes.includes(required);
}

const allowDemo =
  typeof process !== "undefined" &&
  (process.env.NODE_ENV !== "production" || process.env.ALLOW_DEMO_API_KEY === "true");

if (allowDemo) {
  registerSeedApiKey("fk_demo_public_1234567890", ["read:packs", "read:fields", "normalize", "validate", "parse"]);
}
