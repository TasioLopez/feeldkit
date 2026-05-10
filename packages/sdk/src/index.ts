export { FeeldKitClient, type FeeldKitClientOptions } from "./client";
export { FeeldKitApiError } from "./error";
export { Transport, type FetchLike, type RetryOptions, type TransportOptions } from "./transport";

export type { NormalizeInput } from "./namespaces/normalize";
export type { TranslateInput } from "./namespaces/translate";
export type { FlowTranslateInput } from "./namespaces/flows";

export type {
  ApiScope,
  ExplainV1,
  ExplainV1Alternate,
  ExplainV1Decision,
  ExplainV1Signal,
  ExplainV1Winner,
  FlowFieldOutput,
  FlowFieldStatus,
  FlowSimulationCase,
  FlowSimulationCaseAssertions,
  FlowSimulationCaseResult,
  FlowSimulationResponse,
  FlowTranslateResponse,
  NormalizeMatch,
  NormalizeResponse,
  OrgConfigProfileImportResult,
  OrgConfigProfileV1,
  PromotedIntelligenceEntry,
  PromotedIntelligenceVersion,
  PromotionProposalRow,
  SimulationProfileV1,
  TranslateCandidate,
  TranslateResponse,
} from "./types";
