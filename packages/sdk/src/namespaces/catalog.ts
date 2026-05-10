import type { Transport } from "../transport";

export class PacksNamespace {
  constructor(private readonly transport: Transport) {}

  list(): Promise<unknown> {
    return this.transport.request("GET", "/api/v1/packs");
  }

  get(packKey: string): Promise<unknown> {
    return this.transport.request("GET", `/api/v1/packs/${encodeURIComponent(packKey)}`);
  }
}

export class FieldTypesNamespace {
  constructor(private readonly transport: Transport) {}

  list(): Promise<unknown> {
    return this.transport.request("GET", "/api/v1/field-types");
  }
}

export class FieldsNamespace {
  constructor(private readonly transport: Transport) {}

  values(fieldKey: string): Promise<unknown> {
    return this.transport.request("GET", `/api/v1/fields/${encodeURIComponent(fieldKey)}/values`);
  }

  search(fieldKey: string, q: string): Promise<unknown> {
    return this.transport.request("GET", `/api/v1/fields/${encodeURIComponent(fieldKey)}/search`, {
      query: { q },
    });
  }
}
