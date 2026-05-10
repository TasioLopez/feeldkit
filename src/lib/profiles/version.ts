/**
 * The app version recorded in profile manifests. Read at module load from the
 * root `package.json`. Returns null when the file cannot be located (e.g. in
 * pruned production deployments).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

let cached: string | null | undefined;

export function getAppVersion(): string | null {
  if (cached !== undefined) return cached;
  try {
    const path = resolve(process.cwd(), "package.json");
    const raw = readFileSync(path, "utf-8");
    const parsed = JSON.parse(raw) as { version?: string };
    cached = typeof parsed.version === "string" ? parsed.version : null;
  } catch {
    cached = null;
  }
  return cached;
}
