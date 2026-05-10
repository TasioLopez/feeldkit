import type { Transport } from "../transport";
import type { TranslateResponse } from "../types";

export type TranslateInput = {
  fromFieldKey: string;
  toFieldKey: string;
  value: string;
  context?: Record<string, unknown>;
  organizationId?: string;
};

function toBody(input: TranslateInput) {
  return {
    from_field_key: input.fromFieldKey,
    to_field_key: input.toFieldKey,
    value: input.value,
    context: input.context,
    organization_id: input.organizationId,
  };
}

export class TranslateNamespace {
  constructor(private readonly transport: Transport) {}

  one(input: TranslateInput): Promise<TranslateResponse> {
    return this.transport.request<TranslateResponse>("POST", "/api/v1/translate", { body: toBody(input) });
  }

  batch(items: TranslateInput[]): Promise<{ results: TranslateResponse[] }> {
    return this.transport.request<{ results: TranslateResponse[] }>("POST", "/api/v1/translate/batch", {
      body: { items: items.map(toBody) },
    });
  }
}
