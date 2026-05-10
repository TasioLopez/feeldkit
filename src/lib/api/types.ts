/**
 * Shared API contract types used by the app and re-exported by the published
 * SDK. Keep these aligned with `packages/sdk/src/types.ts`; the SDK stays
 * standalone for npm consumers, while the app imports from here when it needs
 * route-facing response contracts.
 */
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
} from "@feeldkit/sdk";
