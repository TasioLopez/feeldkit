import type { Transport } from "../transport";

export class CrosswalkNamespace {
  constructor(private readonly transport: Transport) {}

  resolve(from: string, to: string, code: string): Promise<unknown> {
    return this.transport.request("GET", "/api/v1/crosswalk", { query: { from, to, code } });
  }
}

export class GeoNamespace {
  constructor(private readonly transport: Transport) {}

  countries(): Promise<unknown> {
    return this.transport.request("GET", "/api/v1/geo/countries");
  }

  country(iso2: string): Promise<unknown> {
    return this.transport.request("GET", `/api/v1/geo/countries/${encodeURIComponent(iso2)}`);
  }

  subdivisions(country: string): Promise<unknown> {
    return this.transport.request("GET", "/api/v1/geo/subdivisions", { query: { country } });
  }

  timezones(): Promise<unknown> {
    return this.transport.request("GET", "/api/v1/geo/timezones");
  }
}

export class StandardsNamespace {
  constructor(private readonly transport: Transport) {}

  currencies(): Promise<unknown> {
    return this.transport.request("GET", "/api/v1/standards/currencies");
  }

  languages(): Promise<unknown> {
    return this.transport.request("GET", "/api/v1/standards/languages");
  }
}

export class CompanyNamespace {
  constructor(private readonly transport: Transport) {}

  employeeBands(): Promise<unknown> {
    return this.transport.request("GET", "/api/v1/company/employee-bands");
  }

  revenueBands(): Promise<unknown> {
    return this.transport.request("GET", "/api/v1/company/revenue-bands");
  }

  fundingStages(): Promise<unknown> {
    return this.transport.request("GET", "/api/v1/company/funding-stages");
  }
}

export class JobsNamespace {
  constructor(private readonly transport: Transport) {}

  normalizeTitle(title: string): Promise<unknown> {
    return this.transport.request("GET", "/api/v1/jobs/normalize-title", { query: { q: title } });
  }
}

export class IndustryNamespace {
  constructor(private readonly transport: Transport) {}

  search(q: string): Promise<unknown> {
    return this.transport.request("GET", "/api/v1/industry/search", { query: { q } });
  }
}

export class IntentNamespace {
  constructor(private readonly transport: Transport) {}

  topics(): Promise<unknown> {
    return this.transport.request("GET", "/api/v1/intent/topics");
  }
}

export class EventsNamespace {
  constructor(private readonly transport: Transport) {}

  types(): Promise<unknown> {
    return this.transport.request("GET", "/api/v1/events/types");
  }
}

export class WebNamespace {
  constructor(private readonly transport: Transport) {}

  parseDomain(value: string): Promise<unknown> {
    return this.transport.request("GET", "/api/v1/web/parse-domain", { query: { value } });
  }

  validateSocialUrl(value: string): Promise<unknown> {
    return this.transport.request("GET", "/api/v1/web/validate-social-url", { query: { value } });
  }
}

export class EmailNamespace {
  constructor(private readonly transport: Transport) {}

  classify(value: string): Promise<unknown> {
    return this.transport.request("GET", "/api/v1/email/classify", { query: { value } });
  }
}

export class TechNamespace {
  constructor(private readonly transport: Transport) {}

  normalize(value: string): Promise<unknown> {
    return this.transport.request("GET", "/api/v1/tech/normalize", { query: { q: value } });
  }
}

export class AiNamespace {
  constructor(private readonly transport: Transport) {}

  fieldDefinitions(): Promise<unknown> {
    return this.transport.request("GET", "/api/v1/ai/field-definitions");
  }

  context(): Promise<unknown> {
    return this.transport.request("GET", "/api/v1/ai/context");
  }

  packSchema(packKey: string): Promise<unknown> {
    return this.transport.request("GET", `/api/v1/ai/packs/${encodeURIComponent(packKey)}/schema`);
  }
}

export class ValidateNamespace {
  constructor(private readonly transport: Transport) {}

  one(fieldKey: string, value: string, context?: Record<string, unknown>): Promise<unknown> {
    return this.transport.request("POST", "/api/v1/validate", {
      body: { field_key: fieldKey, value, context },
    });
  }
}

export class ParseNamespace {
  constructor(private readonly transport: Transport) {}

  one(fieldKey: string, value: string, context?: Record<string, unknown>): Promise<unknown> {
    return this.transport.request("POST", "/api/v1/parse", {
      body: { field_key: fieldKey, value, context },
    });
  }
}

export class SuggestNamespace {
  constructor(private readonly transport: Transport) {}

  one(fieldKey: string, value: string, context?: Record<string, unknown>): Promise<unknown> {
    return this.transport.request("POST", "/api/v1/suggest", {
      body: { field_key: fieldKey, value, context },
    });
  }
}
