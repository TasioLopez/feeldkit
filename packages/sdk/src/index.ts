type NormalizeInput = {
  fieldKey: string;
  input: string;
  context?: Record<string, unknown>;
};

function defaultBaseUrl(): string {
  if (typeof process !== "undefined" && process.env.FEELDKIT_BASE_URL) {
    return process.env.FEELDKIT_BASE_URL.replace(/\/$/, "");
  }
  return "https://feeldkit.dev";
}

export class FeeldKitApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "FeeldKitApiError";
    this.status = status;
    this.body = body;
  }
}

export interface FeeldKitClientOptions {
  apiKey: string;
  /** Base URL without trailing slash. Defaults to `FEELDKIT_BASE_URL` or `https://feeldkit.dev`. */
  baseUrl?: string;
}

export class FeeldKitClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(options: FeeldKitClientOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl ?? defaultBaseUrl();
  }

  private async request(path: string, init?: RequestInit): Promise<unknown> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        "content-type": "application/json",
        "x-api-key": this.apiKey,
        ...(init?.headers ?? {}),
      },
    });
    const text = await response.text();
    let parsed: unknown = text;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = text;
    }
    if (!response.ok) {
      const message =
        typeof parsed === "object" &&
        parsed !== null &&
        "error" in parsed &&
        typeof (parsed as { error: unknown }).error === "string"
          ? (parsed as { error: string }).error
          : `FeeldKit API request failed: ${response.status}`;
      throw new FeeldKitApiError(message, response.status, parsed);
    }
    return parsed;
  }

  normalize(input: NormalizeInput) {
    return this.request("/api/v1/normalize", {
      method: "POST",
      body: JSON.stringify({
        field_key: input.fieldKey,
        value: input.input,
        context: input.context,
      }),
    });
  }

  normalizeBatch(items: NormalizeInput[]) {
    return this.request("/api/v1/normalize/batch", {
      method: "POST",
      body: JSON.stringify({
        items: items.map((item) => ({
          field_key: item.fieldKey,
          value: item.input,
          context: item.context,
        })),
      }),
    });
  }

  validate(fieldKey: string, value: string, context?: Record<string, unknown>) {
    return this.request("/api/v1/validate", {
      method: "POST",
      body: JSON.stringify({ field_key: fieldKey, value, context }),
    });
  }

  parse(fieldKey: string, value: string, context?: Record<string, unknown>) {
    return this.request("/api/v1/parse", {
      method: "POST",
      body: JSON.stringify({ field_key: fieldKey, value, context }),
    });
  }

  crosswalk(from: string, to: string, code: string) {
    const params = new URLSearchParams({ from, to, code });
    return this.request(`/api/v1/crosswalk?${params.toString()}`);
  }

  geo = {
    countries: () => this.request("/api/v1/geo/countries"),
    subdivisions: (country: string) => this.request(`/api/v1/geo/subdivisions?country=${encodeURIComponent(country)}`),
  };

  company = {
    employeeBands: () => this.request("/api/v1/company/employee-bands"),
    revenueBands: () => this.request("/api/v1/company/revenue-bands"),
  };

  jobs = {
    normalizeTitle: (title: string) => this.request(`/api/v1/jobs/normalize-title?q=${encodeURIComponent(title)}`),
  };

  email = {
    classify: (value: string) => this.request(`/api/v1/email/classify?value=${encodeURIComponent(value)}`),
  };

  tech = {
    normalize: (value: string) => this.request(`/api/v1/tech/normalize?q=${encodeURIComponent(value)}`),
  };
}
