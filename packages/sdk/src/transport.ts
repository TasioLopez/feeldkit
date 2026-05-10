import { FeeldKitApiError } from "./error";

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export type RetryOptions = {
  /** Max retry attempts on 5xx + 429 (idempotent only). 0 disables retries. */
  retries?: number;
  /** Initial backoff delay in ms (exponential). */
  baseDelayMs?: number;
  /** Optional cap for total wait between attempts (ms). */
  maxDelayMs?: number;
};

export type TransportOptions = {
  apiKey: string;
  baseUrl: string;
  fetch?: FetchLike;
  organizationId?: string;
  defaultHeaders?: Record<string, string>;
  retry?: RetryOptions;
};

const DEFAULT_RETRY: Required<RetryOptions> = {
  retries: 0,
  baseDelayMs: 250,
  maxDelayMs: 4000,
};

export class Transport {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchFn: FetchLike;
  private readonly organizationId?: string;
  private readonly defaultHeaders: Record<string, string>;
  private readonly retry: Required<RetryOptions>;

  constructor(opts: TransportOptions) {
    this.apiKey = opts.apiKey;
    this.baseUrl = opts.baseUrl.replace(/\/$/, "");
    this.fetchFn = opts.fetch ?? ((typeof globalThis !== "undefined" && globalThis.fetch
      ? globalThis.fetch.bind(globalThis)
      : (() => {
          throw new Error("FeeldKit SDK: no global fetch available; pass `fetch` in options.");
        })()) as FetchLike);
    this.organizationId = opts.organizationId;
    this.defaultHeaders = opts.defaultHeaders ?? {};
    this.retry = { ...DEFAULT_RETRY, ...(opts.retry ?? {}) };
  }

  async request<T>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    init: { body?: unknown; query?: Record<string, string | number | boolean | null | undefined>; headers?: Record<string, string> } = {},
  ): Promise<T> {
    const url = this.buildUrl(path, init.query);
    const idempotent = method === "GET";
    const maxAttempts = idempotent ? this.retry.retries + 1 : 1;

    let lastError: unknown = null;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        return await this.executeOnce<T>(method, url, init);
      } catch (err) {
        lastError = err;
        if (!shouldRetry(err) || attempt === maxAttempts - 1) {
          throw err;
        }
        await sleep(backoffMs(attempt, this.retry));
      }
    }
    throw lastError;
  }

  private async executeOnce<T>(
    method: string,
    url: string,
    init: { body?: unknown; headers?: Record<string, string> },
  ): Promise<T> {
    const headers: Record<string, string> = {
      "x-api-key": this.apiKey,
      accept: "application/json",
      ...this.defaultHeaders,
      ...(init.headers ?? {}),
    };
    if (this.organizationId && !headers["x-feeldkit-organization-id"]) {
      headers["x-feeldkit-organization-id"] = this.organizationId;
    }
    if (init.body !== undefined && !headers["content-type"]) {
      headers["content-type"] = "application/json";
    }

    const response = await this.fetchFn(url, {
      method,
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
    const text = await response.text();
    let parsed: unknown = text;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = text;
    }
    if (!response.ok) {
      throw new FeeldKitApiError(toErrorMessage(parsed, response.status), response.status, parsed);
    }
    return parsed as T;
  }

  private buildUrl(path: string, query?: Record<string, string | number | boolean | null | undefined>): string {
    const base = `${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
    if (!query) return base;
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue;
      params.append(key, String(value));
    }
    const qs = params.toString();
    return qs ? `${base}${base.includes("?") ? "&" : "?"}${qs}` : base;
  }
}

function toErrorMessage(parsed: unknown, status: number): string {
  if (
    typeof parsed === "object" &&
    parsed !== null &&
    "error" in parsed &&
    typeof (parsed as { error: unknown }).error === "string"
  ) {
    return (parsed as { error: string }).error;
  }
  return `FeeldKit API request failed: ${status}`;
}

function shouldRetry(err: unknown): boolean {
  if (err instanceof FeeldKitApiError) {
    return err.status === 429 || err.status >= 500;
  }
  return true;
}

function backoffMs(attempt: number, retry: Required<RetryOptions>): number {
  return Math.min(retry.baseDelayMs * 2 ** attempt, retry.maxDelayMs);
}

function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}
