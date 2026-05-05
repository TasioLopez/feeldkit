/**
 * Run flow packs against fixtures under `tests/fixtures/flows/*.json` and emit a precision report.
 *
 * Usage:
 *   npm run flows:precision
 *
 * Writes `.generated/flows-precision-report.json` and exits non-zero when any flow falls below
 * the deterministic baseline. The fixture format expects each case to declare expected target
 * outcomes; the script tallies matched / skipped / unmapped per case.
 */
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { runFlow, type FlowFieldOutput } from "../src/lib/flows/run-flow";

type FixtureExpected = {
  matched_targets?: string[];
  skipped_targets?: string[];
  unmapped_targets?: string[];
  non_required_translates?: string[];
  skipped_translates?: string[];
};

type FixtureCase = {
  name: string;
  source_record: Record<string, unknown>;
  expected: FixtureExpected;
};

type Fixture = {
  flow_key: string;
  cases: FixtureCase[];
};

type CaseResult = {
  name: string;
  ok: boolean;
  passed_assertions: number;
  total_assertions: number;
  failures: string[];
  fields: FlowFieldOutput[];
};

type FixtureResult = {
  fixture: string;
  flow_key: string;
  total: number;
  passed: number;
  pass_rate: number;
  cases: CaseResult[];
};

const FIXTURE_DIR = resolve(process.cwd(), "tests", "fixtures", "flows");
const REPORT_DIR = resolve(process.cwd(), ".generated");
const REPORT_PATH = resolve(REPORT_DIR, "flows-precision-report.json");

const DEFAULT_BASELINE = 0.7;
const BASELINES: Record<string, number> = {
  linkedin_salesnav__hubspot: 0.6,
};

async function loadFixtures(): Promise<Array<{ name: string; fixture: Fixture }>> {
  let files: string[] = [];
  try {
    files = await readdir(FIXTURE_DIR);
  } catch {
    return [];
  }
  const out: Array<{ name: string; fixture: Fixture }> = [];
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    const raw = await readFile(resolve(FIXTURE_DIR, file), "utf8");
    out.push({ name: file, fixture: JSON.parse(raw) as Fixture });
  }
  return out;
}

function checkAssertions(fields: FlowFieldOutput[], expected: FixtureExpected): {
  ok: boolean;
  passed: number;
  total: number;
  failures: string[];
} {
  const failures: string[] = [];
  let passed = 0;
  let total = 0;

  const byTarget = new Map<string, FlowFieldOutput[]>();
  for (const field of fields) {
    const list = byTarget.get(field.target_field_key) ?? [];
    list.push(field);
    byTarget.set(field.target_field_key, list);
  }

  for (const target of expected.matched_targets ?? []) {
    total += 1;
    const list = byTarget.get(target) ?? [];
    const ok = list.some((entry) => entry.status === "matched");
    if (ok) passed += 1;
    else failures.push(`expected matched: ${target}`);
  }
  for (const target of expected.skipped_targets ?? []) {
    total += 1;
    const list = byTarget.get(target) ?? [];
    const ok = list.some((entry) => entry.status === "skipped");
    if (ok) passed += 1;
    else failures.push(`expected skipped: ${target}`);
  }
  for (const target of expected.unmapped_targets ?? []) {
    total += 1;
    const list = byTarget.get(target) ?? [];
    const ok = list.some((entry) => entry.status === "unmapped");
    if (ok) passed += 1;
    else failures.push(`expected unmapped: ${target}`);
  }
  for (const target of expected.non_required_translates ?? []) {
    total += 1;
    const list = byTarget.get(target) ?? [];
    const ok = list.some((entry) => ["matched", "unmapped"].includes(entry.status));
    if (ok) passed += 1;
    else failures.push(`expected matched or unmapped: ${target}`);
  }
  for (const target of expected.skipped_translates ?? []) {
    total += 1;
    const list = byTarget.get(target) ?? [];
    const ok = list.some((entry) => entry.status === "skipped" && entry.kind === "translate");
    if (ok) passed += 1;
    else failures.push(`expected skipped translate: ${target}`);
  }

  return { ok: failures.length === 0, passed, total, failures };
}

function parseOrganizationIdFromArgv(): string | undefined {
  const idx = process.argv.indexOf("--organization-id");
  if (idx === -1) return undefined;
  const next = process.argv[idx + 1];
  return next?.trim() || undefined;
}

async function runFixture(name: string, fixture: Fixture, organizationId?: string): Promise<FixtureResult> {
  const caseResults: CaseResult[] = [];
  for (const fixtureCase of fixture.cases) {
    const result = await runFlow({
      flow_key: fixture.flow_key,
      source_record: fixtureCase.source_record,
      ...(organizationId ? { organization_id: organizationId } : {}),
    });
    const checked = checkAssertions(result.fields, fixtureCase.expected);
    caseResults.push({
      name: fixtureCase.name,
      ok: checked.ok,
      passed_assertions: checked.passed,
      total_assertions: checked.total,
      failures: checked.failures,
      fields: result.fields,
    });
  }
  const passed = caseResults.filter((c) => c.ok).length;
  return {
    fixture: name,
    flow_key: fixture.flow_key,
    total: caseResults.length,
    passed,
    pass_rate: caseResults.length === 0 ? 1 : passed / caseResults.length,
    cases: caseResults,
  };
}

async function main() {
  const orgFromCli = parseOrganizationIdFromArgv();
  if (orgFromCli) {
    console.log(`[INFO] flows:precision organization_id=${orgFromCli}`);
  }
  const fixtures = await loadFixtures();
  if (fixtures.length === 0) {
    console.log("[WARN] no flow precision fixtures found in tests/fixtures/flows/");
    return;
  }
  const results: FixtureResult[] = [];
  for (const { name, fixture } of fixtures) {
    const result = await runFixture(name, fixture, orgFromCli);
    const baseline = BASELINES[result.flow_key] ?? DEFAULT_BASELINE;
    const ok = result.pass_rate >= baseline;
    console.log(
      `${ok ? "[OK]" : "[LOW]"} fixture=${name} flow=${result.flow_key} pass_rate=${result.pass_rate.toFixed(2)} baseline=${baseline.toFixed(2)} (${result.passed}/${result.total})`,
    );
    results.push(result);
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
    const baseline = BASELINES[result.flow_key] ?? DEFAULT_BASELINE;
    return result.pass_rate < baseline;
  });
  if (failed) {
    console.error("[FAIL] one or more flow fixtures fell below their baseline");
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
