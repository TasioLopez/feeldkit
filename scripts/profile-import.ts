import { readFile } from "node:fs/promises";

type Args = {
  file?: string;
  org?: string;
  apply: boolean;
};

function parseArgs(argv: string[]): Args {
  const args: Args = { apply: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--file" && next) {
      args.file = next;
      i++;
    } else if (arg === "--org" && next) {
      args.org = next;
      i++;
    } else if (arg === "--apply") {
      args.apply = true;
    } else if (arg === "--dry-run") {
      args.apply = false;
    }
  }
  return args;
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.file) throw new Error("Usage: npm run profile:import -- --file <path> [--org <id>] [--apply]");

  const profile = JSON.parse(await readFile(args.file, "utf8")) as unknown;
  const apiKey = requiredEnv("FEELDKIT_API_KEY");
  const baseUrl = (process.env.FEELDKIT_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const headers: Record<string, string> = {
    "x-api-key": apiKey,
    "content-type": "application/json",
    accept: "application/json",
  };
  if (args.org) headers["x-feeldkit-organization-id"] = args.org;

  const dryRun = !args.apply;
  const response = await fetch(`${baseUrl}/api/v1/admin/profile/import`, {
    method: "POST",
    headers,
    body: JSON.stringify({ profile, dry_run: dryRun }),
  });
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`profile import failed (${response.status}): ${body}`);
  }
  const parsed = JSON.parse(body) as {
    ok: boolean;
    dry_run: boolean;
    applied: Record<string, number>;
    conflicts: unknown[];
    audit_id: string | null;
  };
  console.log(JSON.stringify(parsed, null, 2));
  if (!parsed.ok || parsed.conflicts.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
