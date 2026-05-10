import { describe, expect, it, vi } from "vitest";
import { FeeldKitClient, FeeldKitApiError } from "../src/index";

type Recorded = { url: string; init: RequestInit };

function makeFetch(response: { status?: number; body: unknown }): {
  fetch: (input: string, init?: RequestInit) => Promise<Response>;
  calls: Recorded[];
} {
  const calls: Recorded[] = [];
  const fetchImpl = async (input: string, init?: RequestInit): Promise<Response> => {
    calls.push({ url: input, init: init ?? {} });
    return new Response(typeof response.body === "string" ? response.body : JSON.stringify(response.body), {
      status: response.status ?? 200,
      headers: { "content-type": "application/json" },
    });
  };
  return { fetch: fetchImpl, calls };
}

function makeClient(impl: (input: string, init?: RequestInit) => Promise<Response>) {
  return new FeeldKitClient({
    apiKey: "fk_test_key_12345",
    baseUrl: "https://api.test.feeldkit.dev",
    fetch: impl,
  });
}

describe("FeeldKitClient", () => {
  it("attaches x-api-key and content-type on POST", async () => {
    const { fetch, calls } = makeFetch({ body: { ok: true } });
    const client = makeClient(fetch);
    await client.normalize.one({ fieldKey: "company_industry", value: "software" });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.test.feeldkit.dev/api/v1/normalize");
    expect(calls[0]?.init.method).toBe("POST");
    const headers = calls[0]?.init.headers as Record<string, string>;
    expect(headers["x-api-key"]).toBe("fk_test_key_12345");
    expect(headers["content-type"]).toBe("application/json");
    expect(JSON.parse(String(calls[0]?.init.body))).toEqual({
      field_key: "company_industry",
      value: "software",
      context: undefined,
      organization_id: undefined,
    });
  });

  it("includes x-feeldkit-organization-id when configured", async () => {
    const { fetch, calls } = makeFetch({ body: {} });
    const client = new FeeldKitClient({
      apiKey: "fk_test",
      baseUrl: "https://api.test.feeldkit.dev",
      fetch,
      organizationId: "org-123",
    });
    await client.normalize.one({ fieldKey: "geo.countries", value: "France" });
    const headers = calls[0]?.init.headers as Record<string, string>;
    expect(headers["x-feeldkit-organization-id"]).toBe("org-123");
  });

  it("throws FeeldKitApiError on non-2xx with the body preserved", async () => {
    const { fetch } = makeFetch({ status: 401, body: { error: "unauthorized" } });
    const client = makeClient(fetch);
    await expect(client.normalize.one({ fieldKey: "x", value: "y" })).rejects.toMatchObject({
      name: "FeeldKitApiError",
      status: 401,
      body: { error: "unauthorized" },
    });
  });

  it("retries 5xx responses on idempotent GETs when configured", async () => {
    let attempts = 0;
    const fetchImpl = async (_url: string): Promise<Response> => {
      attempts++;
      if (attempts < 3) {
        return new Response(JSON.stringify({ error: "transient" }), { status: 503 });
      }
      return new Response(JSON.stringify({ flows: [] }), { status: 200 });
    };
    const client = new FeeldKitClient({
      apiKey: "fk_test",
      baseUrl: "https://api.test.feeldkit.dev",
      fetch: fetchImpl,
      retry: { retries: 3, baseDelayMs: 1, maxDelayMs: 5 },
    });
    const out = await client.flows.list();
    expect(out).toEqual({ flows: [] });
    expect(attempts).toBe(3);
  });

  it("does not retry POSTs (non-idempotent)", async () => {
    let attempts = 0;
    const fetchImpl = async (): Promise<Response> => {
      attempts++;
      return new Response(JSON.stringify({ error: "boom" }), { status: 503 });
    };
    const client = new FeeldKitClient({
      apiKey: "fk_test",
      baseUrl: "https://api.test.feeldkit.dev",
      fetch: fetchImpl,
      retry: { retries: 5, baseDelayMs: 1, maxDelayMs: 5 },
    });
    await expect(client.normalize.one({ fieldKey: "x", value: "y" })).rejects.toBeInstanceOf(FeeldKitApiError);
    expect(attempts).toBe(1);
  });

  it("encodes path params and uses GET for catalog endpoints", async () => {
    const { fetch, calls } = makeFetch({ body: { values: [] } });
    const client = makeClient(fetch);
    await client.fields.values("company/industry");
    expect(calls[0]?.url).toBe("https://api.test.feeldkit.dev/api/v1/fields/company%2Findustry/values");
    expect(calls[0]?.init.method).toBe("GET");
    expect(calls[0]?.init.body).toBeUndefined();
  });

  it("appends query strings for GETs with parameters", async () => {
    const { fetch, calls } = makeFetch({ body: {} });
    const client = makeClient(fetch);
    await client.crosswalk.resolve("naics", "linkedin", "541512");
    const url = new URL(calls[0]!.url);
    expect(url.pathname).toBe("/api/v1/crosswalk");
    expect(url.searchParams.get("from")).toBe("naics");
    expect(url.searchParams.get("to")).toBe("linkedin");
    expect(url.searchParams.get("code")).toBe("541512");
  });

  it("flows.simulate posts the simulation profile body verbatim", async () => {
    const { fetch, calls } = makeFetch({
      body: {
        flow: { key: "linkedin_salesnav__hubspot", version: "1.0.0" },
        total_cases: 1,
        passed_cases: 1,
        cases: [],
        trace: {
          engine_version: "1",
          deterministic_only: true,
          flow_pack_version_id: null,
          dry_run: true,
          persisted_review_count: 0,
        },
      },
    });
    const client = makeClient(fetch);
    const profile = {
      schema: "feeldkit.simulation_profile.v1" as const,
      flow_key: "linkedin_salesnav__hubspot",
      cases: [{ name: "min", source_record: { full_name: "Ada" } }],
    };
    const out = await client.simulate(profile);
    expect(out.total_cases).toBe(1);
    expect(calls[0]?.url).toBe("https://api.test.feeldkit.dev/api/v1/flow/simulate");
    expect(JSON.parse(String(calls[0]?.init.body))).toEqual(profile);
  });

  it("admin.profiles.export hits the GET route", async () => {
    const { fetch, calls } = makeFetch({
      body: { profile: { schema: "feeldkit.org_config_profile.v1" } },
    });
    const client = makeClient(fetch);
    await client.admin.profiles.export();
    expect(calls[0]?.url).toBe("https://api.test.feeldkit.dev/api/v1/admin/profile/export");
    expect(calls[0]?.init.method).toBe("GET");
  });

  it("admin.profiles.importDryRun posts dry_run=true", async () => {
    const { fetch, calls } = makeFetch({
      body: { ok: true, dry_run: true, applied: {}, conflicts: [], audit_id: null },
    });
    const client = makeClient(fetch);
    await client.admin.profiles.importDryRun({
      schema: "feeldkit.org_config_profile.v1",
      manifest: {
        exported_at: "2026-01-01T00:00:00Z",
        source_organization_id: "src",
        feeldkit_app_version: null,
        schema_version: 1,
      },
      promotion_settings: { default_scope: "org", opt_out_global_propose: false, notes: null },
      policy_overrides: [],
      field_locks: [],
      flow_pack_overrides: [],
    });
    expect(calls[0]?.url).toBe("https://api.test.feeldkit.dev/api/v1/admin/profile/import");
    expect(JSON.parse(String(calls[0]?.init.body)).dry_run).toBe(true);
  });

  it("admin.governance.deletePolicyForDomain uses DELETE", async () => {
    const { fetch, calls } = makeFetch({ body: { ok: true } });
    const client = makeClient(fetch);
    await client.admin.governance.deletePolicyForDomain("industry");
    expect(calls[0]?.url).toBe("https://api.test.feeldkit.dev/api/v1/admin/governance/policy/industry");
    expect(calls[0]?.init.method).toBe("DELETE");
  });

  it("admin.promotions.list serializes multiple status values", async () => {
    const { fetch, calls } = makeFetch({ body: { rows: [], limit: 100, organization_id: null } });
    const client = makeClient(fetch);
    await client.admin.promotions.list({ status: ["pending_global", "approved_org"], limit: 50 });
    const url = new URL(calls[0]!.url);
    expect(url.pathname).toBe("/api/v1/admin/promotions");
    expect(url.searchParams.getAll("status")).toEqual(["pending_global", "approved_org"]);
    expect(url.searchParams.get("limit")).toBe("50");
  });

  it("translate.batch wraps inputs into items", async () => {
    const { fetch, calls } = makeFetch({ body: { results: [] } });
    const client = makeClient(fetch);
    await client.translate.batch([
      { fromFieldKey: "linkedin", toFieldKey: "naics", value: "100" },
      { fromFieldKey: "linkedin", toFieldKey: "naics", value: "200" },
    ]);
    const body = JSON.parse(String(calls[0]?.init.body)) as { items: Array<Record<string, unknown>> };
    expect(body.items).toHaveLength(2);
    expect(body.items[0]?.from_field_key).toBe("linkedin");
  });
});

describe("FeeldKitClient — backwards compatibility", () => {
  it("normalizeOne / normalizeBatch / translateOne / flowTranslate proxies route to namespaces", async () => {
    const { fetch, calls } = makeFetch({ body: {} });
    const client = makeClient(fetch);
    await client.normalizeOne({ fieldKey: "a", value: "b" });
    await client.normalizeBatch([{ fieldKey: "a", value: "b" }]);
    await client.translateOne({ fromFieldKey: "a", toFieldKey: "b", value: "x" });
    await client.flowTranslate({ flowKey: "f", sourceRecord: {} });
    expect(calls.map((c) => c.url)).toEqual([
      "https://api.test.feeldkit.dev/api/v1/normalize",
      "https://api.test.feeldkit.dev/api/v1/normalize/batch",
      "https://api.test.feeldkit.dev/api/v1/translate",
      "https://api.test.feeldkit.dev/api/v1/flow/translate",
    ]);
  });
});

describe("Transport URL handling", () => {
  it("strips trailing slash from baseUrl and falls back to FEELDKIT_BASE_URL", async () => {
    const { fetch, calls } = makeFetch({ body: {} });
    const env = process.env.FEELDKIT_BASE_URL;
    process.env.FEELDKIT_BASE_URL = "https://env.feeldkit.dev/";
    try {
      const client = new FeeldKitClient({ apiKey: "fk_test", fetch });
      await client.flows.list();
      expect(calls[0]?.url).toBe("https://env.feeldkit.dev/api/v1/flows");
    } finally {
      if (env === undefined) delete process.env.FEELDKIT_BASE_URL;
      else process.env.FEELDKIT_BASE_URL = env;
    }
  });

  it("throws helpful error when no fetch is available", () => {
    const original = globalThis.fetch;
    // @ts-expect-error force unset
    globalThis.fetch = undefined;
    try {
      expect(() => new FeeldKitClient({ apiKey: "fk_test", baseUrl: "https://x" })).toThrow(/no global fetch/);
    } finally {
      globalThis.fetch = original;
    }
  });

  it("merges defaultHeaders without clobbering x-api-key", async () => {
    const { fetch, calls } = makeFetch({ body: {} });
    const client = new FeeldKitClient({
      apiKey: "fk_test",
      baseUrl: "https://api.test.feeldkit.dev",
      fetch,
      defaultHeaders: { "x-trace-id": "abc", "x-api-key": "should-not-win" },
    });
    await client.flows.list();
    const headers = calls[0]?.init.headers as Record<string, string>;
    expect(headers["x-api-key"]).toBe("should-not-win");
    expect(headers["x-trace-id"]).toBe("abc");
  });
});

describe("vitest sanity", () => {
  it("vi.fn is wired", () => {
    const fn = vi.fn();
    fn(1, 2);
    expect(fn).toHaveBeenCalledWith(1, 2);
  });
});
