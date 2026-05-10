/**
 * Verify that every `/api/v1/**` route under `src/app/api/v1` is documented in
 * `public/openapi.yaml`. Fails non-zero if any route is missing.
 *
 * Usage:
 *   npm run docs:openapi-check
 */
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

type Route = { fsPath: string; openapiPath: string };

const REPO_ROOT = process.cwd();
const ROUTES_ROOT = resolve(REPO_ROOT, "src/app/api/v1");
const OPENAPI_PATH = resolve(REPO_ROOT, "public/openapi.yaml");

async function walk(dir: string, results: string[] = []): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full, results);
    } else if (entry.isFile() && entry.name === "route.ts") {
      results.push(full);
    }
  }
  return results;
}

function fsToOpenApiPath(fsRoutePath: string): string {
  const rel = fsRoutePath.replace(ROUTES_ROOT, "").replace(/\\/g, "/").replace(/\/route\.ts$/, "");
  return rel
    .split("/")
    .filter((seg) => seg.length > 0)
    .map((seg) => seg.replace(/^\[(.+)\]$/, "{$1}"))
    .map((seg) => seg.replace(/^\{\.\.\.(.+)\}$/, "{$1}"))
    .reduce((acc, seg) => `${acc}/${seg}`, "");
}

function extractDocumentedPaths(yaml: string): Set<string> {
  const lines = yaml.split(/\r?\n/);
  const docs = new Set<string>();
  let inPaths = false;
  for (const line of lines) {
    if (/^paths\s*:/.test(line)) {
      inPaths = true;
      continue;
    }
    if (inPaths) {
      if (/^[A-Za-z_]/.test(line)) {
        inPaths = false;
        continue;
      }
      const match = line.match(/^\s{2}(\/[^:]+):\s*$/);
      if (match) {
        docs.add(match[1]!.trim());
      }
    }
  }
  return docs;
}

async function main() {
  const routeFiles = await walk(ROUTES_ROOT);
  const routes: Route[] = routeFiles
    .map((fsPath) => ({ fsPath, openapiPath: fsToOpenApiPath(fsPath) }))
    .sort((a, b) => a.openapiPath.localeCompare(b.openapiPath));

  const yaml = await readFile(OPENAPI_PATH, "utf-8");
  const documented = extractDocumentedPaths(yaml);

  const missing: string[] = [];
  for (const route of routes) {
    if (!documented.has(route.openapiPath)) {
      missing.push(route.openapiPath);
    }
  }

  const extras: string[] = [];
  const codePaths = new Set(routes.map((r) => r.openapiPath));
  for (const docPath of documented) {
    if (!codePaths.has(docPath)) {
      extras.push(docPath);
    }
  }

  console.log(`[INFO] discovered ${routes.length} route handlers`);
  console.log(`[INFO] openapi.yaml documents ${documented.size} paths`);

  let exit = 0;
  if (missing.length > 0) {
    console.error(`[FAIL] missing from public/openapi.yaml (${missing.length}):`);
    for (const path of missing) console.error(`  - ${path}`);
    exit = 1;
  }
  if (extras.length > 0) {
    console.warn(`[WARN] documented in openapi.yaml but no route on disk (${extras.length}):`);
    for (const path of extras) console.warn(`  - ${path}`);
  }
  if (missing.length === 0 && extras.length === 0) {
    console.log("[OK] public/openapi.yaml matches src/app/api/v1 routes 1:1");
  }
  process.exit(exit);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
