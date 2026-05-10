import { Transport, type FetchLike, type RetryOptions } from "./transport";
import { NormalizeNamespace, type NormalizeInput } from "./namespaces/normalize";
import { TranslateNamespace, type TranslateInput } from "./namespaces/translate";
import { FlowsNamespace, type FlowTranslateInput } from "./namespaces/flows";
import {
  PacksNamespace,
  FieldTypesNamespace,
  FieldsNamespace,
} from "./namespaces/catalog";
import {
  CrosswalkNamespace,
  GeoNamespace,
  StandardsNamespace,
  CompanyNamespace,
  JobsNamespace,
  IndustryNamespace,
  IntentNamespace,
  EventsNamespace,
  WebNamespace,
  EmailNamespace,
  TechNamespace,
  AiNamespace,
  ValidateNamespace,
  ParseNamespace,
  SuggestNamespace,
} from "./namespaces/domain";
import { PromotedIntelligenceNamespace } from "./namespaces/promoted-intelligence";
import { AdminClient } from "./namespaces/admin";
import type {
  FlowSimulationResponse,
  FlowTranslateResponse,
  NormalizeResponse,
  SimulationProfileV1,
  TranslateResponse,
} from "./types";

function defaultBaseUrl(): string {
  if (typeof process !== "undefined" && process.env && process.env.FEELDKIT_BASE_URL) {
    return process.env.FEELDKIT_BASE_URL.replace(/\/$/, "");
  }
  return "https://feeldkit.dev";
}

export interface FeeldKitClientOptions {
  apiKey: string;
  /** Base URL without trailing slash. Defaults to `FEELDKIT_BASE_URL` or `https://feeldkit.dev`. */
  baseUrl?: string;
  /** Custom fetch implementation; defaults to `globalThis.fetch`. */
  fetch?: FetchLike;
  /** When set, every request includes `x-feeldkit-organization-id`. */
  organizationId?: string;
  /** Extra headers added to every request (after `x-api-key`, before per-call headers). */
  defaultHeaders?: Record<string, string>;
  /** Retry policy. Idempotent (GET) calls retry on 429 + 5xx; default `retries: 0`. */
  retry?: RetryOptions;
}

export class FeeldKitClient {
  private readonly transport: Transport;

  readonly normalize: NormalizeNamespace;
  readonly translate: TranslateNamespace;
  readonly flows: FlowsNamespace;
  readonly packs: PacksNamespace;
  readonly fieldTypes: FieldTypesNamespace;
  readonly fields: FieldsNamespace;
  readonly crosswalk: CrosswalkNamespace;
  readonly geo: GeoNamespace;
  readonly standards: StandardsNamespace;
  readonly company: CompanyNamespace;
  readonly jobs: JobsNamespace;
  readonly industry: IndustryNamespace;
  readonly intent: IntentNamespace;
  readonly events: EventsNamespace;
  readonly web: WebNamespace;
  readonly email: EmailNamespace;
  readonly tech: TechNamespace;
  readonly ai: AiNamespace;
  readonly validate: ValidateNamespace;
  readonly parse: ParseNamespace;
  readonly suggest: SuggestNamespace;
  readonly promotedIntelligence: PromotedIntelligenceNamespace;
  readonly admin: AdminClient;

  constructor(options: FeeldKitClientOptions) {
    this.transport = new Transport({
      apiKey: options.apiKey,
      baseUrl: options.baseUrl ?? defaultBaseUrl(),
      fetch: options.fetch,
      organizationId: options.organizationId,
      defaultHeaders: options.defaultHeaders,
      retry: options.retry,
    });

    this.normalize = new NormalizeNamespace(this.transport);
    this.translate = new TranslateNamespace(this.transport);
    this.flows = new FlowsNamespace(this.transport);
    this.packs = new PacksNamespace(this.transport);
    this.fieldTypes = new FieldTypesNamespace(this.transport);
    this.fields = new FieldsNamespace(this.transport);
    this.crosswalk = new CrosswalkNamespace(this.transport);
    this.geo = new GeoNamespace(this.transport);
    this.standards = new StandardsNamespace(this.transport);
    this.company = new CompanyNamespace(this.transport);
    this.jobs = new JobsNamespace(this.transport);
    this.industry = new IndustryNamespace(this.transport);
    this.intent = new IntentNamespace(this.transport);
    this.events = new EventsNamespace(this.transport);
    this.web = new WebNamespace(this.transport);
    this.email = new EmailNamespace(this.transport);
    this.tech = new TechNamespace(this.transport);
    this.ai = new AiNamespace(this.transport);
    this.validate = new ValidateNamespace(this.transport);
    this.parse = new ParseNamespace(this.transport);
    this.suggest = new SuggestNamespace(this.transport);
    this.promotedIntelligence = new PromotedIntelligenceNamespace(this.transport);
    this.admin = new AdminClient(this.transport);
  }

  /**
   * Convenience proxy for `client.normalize.one()` — kept for backwards
   * compatibility with @feeldkit/sdk@0.1.x consumers.
   */
  normalizeOne(input: NormalizeInput): Promise<NormalizeResponse> {
    return this.normalize.one(input);
  }

  normalizeBatch(items: NormalizeInput[]): Promise<{ results: NormalizeResponse[] }> {
    return this.normalize.batch(items);
  }

  translateOne(input: TranslateInput): Promise<TranslateResponse> {
    return this.translate.one(input);
  }

  flowTranslate(input: FlowTranslateInput): Promise<FlowTranslateResponse> {
    return this.flows.translate(input);
  }

  /** Phase 6 helper. Same as `client.flows.simulate(profile)`. */
  simulate(profile: SimulationProfileV1): Promise<FlowSimulationResponse> {
    return this.flows.simulate(profile);
  }
}
