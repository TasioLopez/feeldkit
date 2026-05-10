import type { Transport } from "../transport";
import type {
  FlowSimulationResponse,
  FlowTranslateResponse,
  SimulationProfileV1,
} from "../types";

export type FlowTranslateInput = {
  flowKey: string;
  sourceRecord: Record<string, unknown>;
  version?: string;
  context?: Record<string, unknown>;
  organizationId?: string;
};

function toBody(input: FlowTranslateInput) {
  return {
    flow_key: input.flowKey,
    source_record: input.sourceRecord,
    version: input.version,
    context: input.context,
    organization_id: input.organizationId,
  };
}

export class FlowsNamespace {
  constructor(private readonly transport: Transport) {}

  list(): Promise<{ flows: Array<{ key: string; name: string; active_version: string | null }> }> {
    return this.transport.request("GET", "/api/v1/flows");
  }

  get(flowKey: string): Promise<unknown> {
    return this.transport.request("GET", `/api/v1/flows/${encodeURIComponent(flowKey)}`);
  }

  version(flowKey: string, version: string): Promise<unknown> {
    return this.transport.request(
      "GET",
      `/api/v1/flows/${encodeURIComponent(flowKey)}/versions/${encodeURIComponent(version)}`,
    );
  }

  translate(input: FlowTranslateInput): Promise<FlowTranslateResponse> {
    return this.transport.request<FlowTranslateResponse>("POST", "/api/v1/flow/translate", { body: toBody(input) });
  }

  translateBatch(items: FlowTranslateInput[]): Promise<{ results: FlowTranslateResponse[] }> {
    return this.transport.request("POST", "/api/v1/flow/translate/batch", {
      body: { items: items.map(toBody) },
    });
  }

  /**
   * Phase 6 simulation endpoint: runs the flow against the supplied profile in
   * dry-run mode. The server guarantees no `mapping_reviews` rows are persisted.
   */
  simulate(profile: SimulationProfileV1): Promise<FlowSimulationResponse> {
    return this.transport.request<FlowSimulationResponse>("POST", "/api/v1/flow/simulate", {
      body: profile,
    });
  }
}
