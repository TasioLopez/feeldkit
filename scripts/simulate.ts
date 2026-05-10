import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { simulateFlow, simulationProfileSchema } from "../src/lib/flows/simulate";

type Args = {
  profile?: string;
  out?: string;
  local: boolean;
};

function parseArgs(argv: string[]): Args {
  const args: Args = { local: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--profile" && next) {
      args.profile = next;
      i++;
    } else if (arg === "--out" && next) {
      args.out = next;
      i++;
    } else if (arg === "--local") {
      args.local = true;
    }
  }
  return args;
}

async function callRemote(profile: unknown): Promise<unknown> {
  const apiKey = process.env.FEELDKIT_API_KEY?.trim();
  if (!apiKey) throw new Error("Missing FEELDKIT_API_KEY (or pass --local)");
  const baseUrl = (process.env.FEELDKIT_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/api/v1/flow/simulate`, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify(profile),
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`simulate failed (${response.status}): ${body}`);
  return JSON.parse(body);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.profile) throw new Error("Usage: npm run simulate -- --profile <simulation-profile.json> [--local]");

  const raw = JSON.parse(await readFile(args.profile, "utf8")) as unknown;
  const parsed = simulationProfileSchema.safeParse(raw);
  if (!parsed.success) {
    console.error(JSON.stringify(parsed.error.flatten(), null, 2));
    throw new Error("Invalid simulation_profile.v1");
  }

  const result = args.local ? await simulateFlow(parsed.data) : await callRemote(parsed.data);
  const out = resolve(process.cwd(), args.out ?? ".generated/simulate-report.json");
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  console.log(`[OK] wrote ${out}`);
  const summary = result as { total_cases?: number; passed_cases?: number };
  if (typeof summary.total_cases === "number") {
    console.log(`[OK] passed ${summary.passed_cases ?? 0}/${summary.total_cases} simulation cases`);
    if ((summary.passed_cases ?? 0) < summary.total_cases) process.exit(1);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
