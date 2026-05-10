import { readFile } from "node:fs/promises";
import { FeeldKitClient, type SimulationProfileV1 } from "@feeldkit/sdk";

const profilePath = process.argv[2] ?? "simulation-profile.json";
const profile = JSON.parse(await readFile(profilePath, "utf8")) as SimulationProfileV1;

const client = new FeeldKitClient({
  apiKey: process.env.FEELDKIT_API_KEY!,
  baseUrl: process.env.FEELDKIT_BASE_URL ?? "http://localhost:3000",
});

const report = await client.simulate(profile);
console.log(JSON.stringify(report, null, 2));
if (report.passed_cases !== report.total_cases) process.exit(1);
