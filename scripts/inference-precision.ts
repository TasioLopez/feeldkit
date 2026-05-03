/**
 * Run the inference engine against fixtures under tests/fixtures/inference/*.json and emit a precision report.
 *
 * Usage:
 *   npx tsx ./scripts/inference-precision.ts
 *
 * The script writes `.generated/inference-precision-report.json` and exits non-zero when the
 * pass rate falls below the configured baseline.
 */
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { runInference } from "../src/lib/matching/inference/engine";
import { getFieldRepository } from "../src/lib/repositories/get-field-repository";

type FixtureCase = {
  input: string;
  expected_key: string;
  expected_band?: "high" | "mid" | "low";
};

type Fixture = {
  domain: string;
  field_key: string;
  cases: FixtureCase[];
};

type CaseResult = {
  input: string;
  expected_key: string;
  actual_key: string | null;
  expected_band?: string;
  actual_band: string;
  status: string;
  passed: boolean;
};

type FixtureResult = {
  fixture: string;
  domain: string;
  field_key: string;
  total: number;
  passed: number;
  pass_rate: number;
  cases: CaseResult[];
};

const FIXTURE_DIR = resolve(process.cwd(), "tests", "fixtures", "inference");
const REPORT_DIR = resolve(process.cwd(), ".generated");
const REPORT_PATH = resolve(REPORT_DIR, "inference-precision-report.json");

const BASELINES: Record<string, number> = {
  geo: 0.85,
  standards: 0.85,
  industry: 0.6,
};
const DEFAULT_BASELINE = 0.7;

async function loadFixtures(): Promise<Array<{ name: string; fixture: Fixture }>> {
  const out: Array<{ name: string; fixture: Fixture }> = [];
  let files: string[] = [];
  try {
    files = await readdir(FIXTURE_DIR);
  } catch {
    return out;
  }
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    const raw = await readFile(resolve(FIXTURE_DIR, file), "utf8");
    const fixture = JSON.parse(raw) as Fixture;
    out.push({ name: file, fixture });
  }
  return out;
}

async function runFixture(name: string, fixture: Fixture): Promise<FixtureResult> {
  const repo = getFieldRepository();
  const caseResults: CaseResult[] = [];
  for (const fixtureCase of fixture.cases) {
    const inference = await runInference(
      { fieldKey: fixture.field_key, value: fixtureCase.input },
      repo,
    );
    const actualKey = inference.winner?.value.key ?? null;
    const actualBand = inference.decision.band;
    const keyOk = actualKey === fixtureCase.expected_key;
    const bandOk = !fixtureCase.expected_band || actualBand === fixtureCase.expected_band;
    caseResults.push({
      input: fixtureCase.input,
      expected_key: fixtureCase.expected_key,
      actual_key: actualKey,
      expected_band: fixtureCase.expected_band,
      actual_band: actualBand,
      status: inference.decision.status,
      passed: keyOk && bandOk,
    });
  }
  const passed = caseResults.filter((c) => c.passed).length;
  return {
    fixture: name,
    domain: fixture.domain,
    field_key: fixture.field_key,
    total: caseResults.length,
    passed,
    pass_rate: caseResults.length === 0 ? 1 : passed / caseResults.length,
    cases: caseResults,
  };
}

async function main() {
  const fixtures = await loadFixtures();
  if (fixtures.length === 0) {
    console.log("[WARN] no precision fixtures found in tests/fixtures/inference/");
    return;
  }

  const results: FixtureResult[] = [];
  for (const { name, fixture } of fixtures) {
    const result = await runFixture(name, fixture);
    results.push(result);
    const baseline = BASELINES[result.domain] ?? DEFAULT_BASELINE;
    const ok = result.pass_rate >= baseline;
    console.log(
      `${ok ? "[OK]" : "[LOW]"} fixture=${name} domain=${result.domain} pass_rate=${result.pass_rate.toFixed(2)} baseline=${baseline.toFixed(2)} (${result.passed}/${result.total})`,
    );
  }

  await mkdir(REPORT_DIR, { recursive: true });
  const summary = {
    generated_at: new Date().toISOString(),
    fixtures: results,
    baselines: BASELINES,
    default_baseline: DEFAULT_BASELINE,
  };
  await writeFile(REPORT_PATH, JSON.stringify(summary, null, 2), "utf8");
  console.log(`[INFO] report written to ${REPORT_PATH}`);

  const failed = results.some((result) => {
    const baseline = BASELINES[result.domain] ?? DEFAULT_BASELINE;
    return result.pass_rate < baseline;
  });
  if (failed) {
    console.error("[FAIL] one or more fixtures fell below their baseline");
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
