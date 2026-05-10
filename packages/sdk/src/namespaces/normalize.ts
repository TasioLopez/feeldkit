import type { Transport } from "../transport";
import type { NormalizeResponse } from "../types";

export type NormalizeInput = {
  fieldKey: string;
  value: string;
  context?: Record<string, unknown>;
  organizationId?: string;
};

function toBody(input: NormalizeInput) {
  return {
    field_key: input.fieldKey,
    value: input.value,
    context: input.context,
    organization_id: input.organizationId,
  };
}

export class NormalizeNamespace {
  constructor(private readonly transport: Transport) {}

  one(input: NormalizeInput): Promise<NormalizeResponse> {
    return this.transport.request<NormalizeResponse>("POST", "/api/v1/normalize", { body: toBody(input) });
  }

  batch(items: NormalizeInput[]): Promise<{ results: NormalizeResponse[] }> {
    return this.transport.request<{ results: NormalizeResponse[] }>("POST", "/api/v1/normalize/batch", {
      body: { items: items.map(toBody) },
    });
  }
}
