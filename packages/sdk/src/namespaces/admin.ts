import type { Transport } from "../transport";
import type {
  OrgConfigProfileImportResult,
  OrgConfigProfileV1,
  PromotionProposalRow,
} from "../types";

export class AdminReviewsNamespace {
  constructor(private readonly transport: Transport) {}

  undo(reviewId: string, opts: { notes?: string } = {}): Promise<unknown> {
    return this.transport.request("POST", `/api/v1/admin/reviews/${encodeURIComponent(reviewId)}/undo`, {
      body: { notes: opts.notes },
    });
  }
}

export class AdminGovernanceNamespace {
  constructor(private readonly transport: Transport) {}

  getPolicy(): Promise<unknown> {
    return this.transport.request("GET", "/api/v1/admin/governance/policy");
  }

  putPolicy(input: { domain: string; matched: number; suggested: number; notes?: string }): Promise<unknown> {
    return this.transport.request("PUT", "/api/v1/admin/governance/policy", { body: input });
  }

  putPolicyForDomain(
    domain: string,
    input: { matched: number; suggested: number; notes?: string },
  ): Promise<unknown> {
    return this.transport.request("PUT", `/api/v1/admin/governance/policy/${encodeURIComponent(domain)}`, {
      body: input,
    });
  }

  deletePolicyForDomain(domain: string): Promise<unknown> {
    return this.transport.request("DELETE", `/api/v1/admin/governance/policy/${encodeURIComponent(domain)}`);
  }

  putFieldLock(input: {
    field_key: string;
    mode: "require_review" | "disable_auto_apply";
    reason?: string;
  }): Promise<unknown> {
    return this.transport.request("PUT", "/api/v1/admin/governance/field-locks", { body: input });
  }

  listFlowOverrides(flowKey?: string): Promise<unknown> {
    return this.transport.request("GET", "/api/v1/admin/governance/flow-overrides", {
      query: flowKey ? { flow_key: flowKey } : undefined,
    });
  }

  putFlowOverride(input: {
    flow_key: string;
    ordinal?: number | null;
    action: "skip" | "replace" | "lock" | "pin_version";
    flow_pack_version_id?: string | null;
    payload?: Record<string, unknown>;
  }): Promise<unknown> {
    return this.transport.request("PUT", "/api/v1/admin/governance/flow-overrides", { body: input });
  }

  getPromotionSettings(): Promise<unknown> {
    return this.transport.request("GET", "/api/v1/admin/governance/promotion-settings");
  }

  putPromotionSettings(input: {
    default_scope: "org" | "global";
    opt_out_global_propose: boolean;
    notes?: string;
  }): Promise<unknown> {
    return this.transport.request("PUT", "/api/v1/admin/governance/promotion-settings", { body: input });
  }
}

export class AdminFlowsNamespace {
  constructor(private readonly transport: Transport) {}

  retire(flowKey: string, version: string, opts: { notes?: string } = {}): Promise<unknown> {
    return this.transport.request(
      "POST",
      `/api/v1/admin/flows/${encodeURIComponent(flowKey)}/versions/${encodeURIComponent(version)}/retire`,
      { body: { notes: opts.notes } },
    );
  }

  rollback(flowKey: string, opts: { to_version: string; notes?: string }): Promise<unknown> {
    return this.transport.request("POST", `/api/v1/admin/flows/${encodeURIComponent(flowKey)}/rollback`, {
      body: opts,
    });
  }
}

export class AdminPromotionsNamespace {
  constructor(private readonly transport: Transport) {}

  list(filters: {
    status?: string[];
    target_table?: string;
    limit?: number;
  } = {}): Promise<{ rows: PromotionProposalRow[]; limit: number; organization_id: string | null }> {
    const query: Record<string, string | number | undefined> = {};
    if (filters.target_table) query.target_table = filters.target_table;
    if (filters.limit !== undefined) query.limit = filters.limit;
    const search = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined) search.append(k, String(v));
    }
    for (const status of filters.status ?? []) {
      search.append("status", status);
    }
    const qs = search.toString();
    return this.transport.request(
      "GET",
      qs ? `/api/v1/admin/promotions?${qs}` : "/api/v1/admin/promotions",
    );
  }

  approve(proposalId: string, opts: { notes?: string } = {}): Promise<unknown> {
    return this.transport.request(
      "POST",
      `/api/v1/admin/promotions/${encodeURIComponent(proposalId)}/approve`,
      { body: { notes: opts.notes } },
    );
  }

  reject(proposalId: string, opts: { notes?: string } = {}): Promise<unknown> {
    return this.transport.request(
      "POST",
      `/api/v1/admin/promotions/${encodeURIComponent(proposalId)}/reject`,
      { body: { notes: opts.notes } },
    );
  }
}

export class AdminProposalsNamespace {
  constructor(private readonly transport: Transport) {}

  undo(proposalId: string, opts: { notes?: string } = {}): Promise<unknown> {
    return this.transport.request(
      "POST",
      `/api/v1/admin/proposals/${encodeURIComponent(proposalId)}/undo`,
      { body: { notes: opts.notes } },
    );
  }
}

export class AdminEnrichmentNamespace {
  constructor(private readonly transport: Transport) {}

  propose(body: Record<string, unknown>): Promise<unknown> {
    return this.transport.request("POST", "/api/v1/admin/enrichment/propose", { body });
  }

  proposeBatch(body: Record<string, unknown>): Promise<unknown> {
    return this.transport.request("POST", "/api/v1/admin/enrichment/propose/batch", { body });
  }

  processJobs(): Promise<unknown> {
    return this.transport.request("POST", "/api/v1/admin/enrichment/jobs/process", { body: {} });
  }
}

export class AdminIndustryNamespace {
  constructor(private readonly transport: Transport) {}

  resolve(body: Record<string, unknown>): Promise<unknown> {
    return this.transport.request("POST", "/api/v1/admin/industry/resolve", { body });
  }

  translate(body: Record<string, unknown>): Promise<unknown> {
    return this.transport.request("POST", "/api/v1/admin/industry/translate", { body });
  }
}

export class AdminAuditNamespace {
  constructor(private readonly transport: Transport) {}

  list(opts: { limit?: number; entity_type?: string; action?: string } = {}): Promise<unknown> {
    return this.transport.request("GET", "/api/v1/admin/audit", {
      query: { limit: opts.limit, entity_type: opts.entity_type, action: opts.action },
    });
  }
}

export class AdminProfilesNamespace {
  constructor(private readonly transport: Transport) {}

  /**
   * Phase 6: export the org_config_profile.v1 bundle for the calling org. The
   * org id is read from the API key (no override).
   */
  export(): Promise<{ profile: OrgConfigProfileV1 }> {
    return this.transport.request("GET", "/api/v1/admin/profile/export");
  }

  /**
   * Phase 6: apply an org_config_profile.v1 bundle to the calling org. Pass
   * `dry_run: true` to preview without writing.
   */
  import(input: {
    profile: OrgConfigProfileV1;
    dry_run?: boolean;
  }): Promise<OrgConfigProfileImportResult> {
    return this.transport.request<OrgConfigProfileImportResult>(
      "POST",
      "/api/v1/admin/profile/import",
      { body: { profile: input.profile, dry_run: input.dry_run ?? false } },
    );
  }

  importDryRun(profile: OrgConfigProfileV1): Promise<OrgConfigProfileImportResult> {
    return this.import({ profile, dry_run: true });
  }
}

export class AdminClient {
  readonly reviews: AdminReviewsNamespace;
  readonly governance: AdminGovernanceNamespace;
  readonly flows: AdminFlowsNamespace;
  readonly promotions: AdminPromotionsNamespace;
  readonly proposals: AdminProposalsNamespace;
  readonly enrichment: AdminEnrichmentNamespace;
  readonly industry: AdminIndustryNamespace;
  readonly audit: AdminAuditNamespace;
  readonly profiles: AdminProfilesNamespace;

  constructor(transport: Transport) {
    this.reviews = new AdminReviewsNamespace(transport);
    this.governance = new AdminGovernanceNamespace(transport);
    this.flows = new AdminFlowsNamespace(transport);
    this.promotions = new AdminPromotionsNamespace(transport);
    this.proposals = new AdminProposalsNamespace(transport);
    this.enrichment = new AdminEnrichmentNamespace(transport);
    this.industry = new AdminIndustryNamespace(transport);
    this.audit = new AdminAuditNamespace(transport);
    this.profiles = new AdminProfilesNamespace(transport);
  }
}
