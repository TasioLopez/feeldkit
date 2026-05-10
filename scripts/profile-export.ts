import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

type Args = {
  org?: string;
  out?: string;
};

function parseArgs(argv: string[]): Args {
  const args: Args = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--org" && next) {
      args.org = next;
      i++;
    } else if (arg === "--out" && next) {
      args.out = next;
      i++;
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
  const apiKey = requiredEnv("FEELDKIT_API_KEY");
  const baseUrl = (process.env.FEELDKIT_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const headers: Record<string, string> = {
    "x-api-key": apiKey,
    accept: "application/json",
  };
  if (args.org) headers["x-feeldkit-organization-id"] = args.org;

  const response = await fetch(`${baseUrl}/api/v1/admin/profile/export`, { headers });
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`profile export failed (${response.status}): ${body}`);
  }
  const parsed = JSON.parse(body) as { profile: unknown };
  const orgSlug = args.org ?? "api-key-org";
  const out = resolve(process.cwd(), args.out ?? `.generated/org-config-profile-${orgSlug}.json`);
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, `${JSON.stringify(parsed.profile, null, 2)}\n`, "utf8");
  console.log(`[OK] wrote ${out}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
