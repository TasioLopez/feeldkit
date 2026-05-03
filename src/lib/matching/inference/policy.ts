import type { MappingStatus } from "@/lib/domain/types";
import type { DomainKey } from "@/lib/matching/inference/weights";

export type ConfidenceBand = "high" | "mid" | "low";

export type PolicyDecision = {
  status: MappingStatus;
  needsReview: boolean;
  band: ConfidenceBand;
  thresholds: { matched: number; suggested: number };
  reason: string;
};

export type DomainPolicy = {
  domain: DomainKey;
  matched: number;
  suggested: number;
};

/** Default thresholds match the legacy single-band classifier (matched>=0.9, suggested>=0.65). */
export const DEFAULT_POLICY: DomainPolicy = {
  domain: "default",
  matched: 0.9,
  suggested: 0.65,
};

/** Domain-level overrides for review-by-exception routing. See docs/INFERENCE_POLICY.md. */
export const DOMAIN_POLICIES: Record<DomainKey, DomainPolicy> = {
  default: DEFAULT_POLICY,
  industry: { domain: "industry", matched: 0.92, suggested: 0.7 },
  geo: { domain: "geo", matched: 0.95, suggested: 0.75 },
  standards: { domain: "standards", matched: 0.97, suggested: 0.85 },
  jobs: { domain: "jobs", matched: 0.9, suggested: 0.65 },
  company: { domain: "company", matched: 0.9, suggested: 0.65 },
  tech: { domain: "tech", matched: 0.9, suggested: 0.65 },
  web: { domain: "web", matched: 0.85, suggested: 0.6 },
};

/**
 * Map a field key (consumer or canonical) to a policy domain.
 * Conservative pattern matching: defaults to `default` if no rule applies.
 */
export function inferDomain(fieldKey: string): DomainKey {
  const k = fieldKey.toLowerCase();
  if (
    k.includes("industry") ||
    k.startsWith("naics") ||
    k.startsWith("nace") ||
    k.startsWith("isic") ||
    k.startsWith("sic_") ||
    k.startsWith("gics") ||
    k.startsWith("linkedin_industry") ||
    k.startsWith("practical_industry")
  ) {
    return "industry";
  }
  if (k.startsWith("country") || k === "countries" || k.includes("subdivision") || k.includes("city")) {
    return "geo";
  }
  if (k === "languages" || k === "currencies" || k === "timezones") {
    return "standards";
  }
  if (k.startsWith("job_") || k.includes("seniority") || k.includes("normalized_job")) {
    return "jobs";
  }
  if (k.startsWith("company_") || k.includes("revenue") || k.includes("funding") || k.includes("headcount") || k.includes("employee")) {
    return "company";
  }
  if (k.startsWith("tech") || k.startsWith("technology")) {
    return "tech";
  }
  if (k.includes("domain") || k.includes("social_url") || k === "email_domains") {
    return "web";
  }
  return "default";
}

export function policyFor(fieldKey: string): DomainPolicy {
  return DOMAIN_POLICIES[inferDomain(fieldKey)] ?? DEFAULT_POLICY;
}

export function classifyWithPolicy(score: number, fieldKey: string): PolicyDecision {
  const policy = policyFor(fieldKey);
  if (score >= policy.matched) {
    return {
      status: "matched",
      needsReview: false,
      band: "high",
      thresholds: { matched: policy.matched, suggested: policy.suggested },
      reason: `score>=${policy.matched.toFixed(2)} for domain=${policy.domain}`,
    };
  }
  if (score >= policy.suggested) {
    return {
      status: "suggested",
      needsReview: false,
      band: "mid",
      thresholds: { matched: policy.matched, suggested: policy.suggested },
      reason: `score>=${policy.suggested.toFixed(2)} for domain=${policy.domain}`,
    };
  }
  return {
    status: "review",
    needsReview: true,
    band: "low",
    thresholds: { matched: policy.matched, suggested: policy.suggested },
    reason: `score<${policy.suggested.toFixed(2)} for domain=${policy.domain}`,
  };
}

/** Asserts every domain policy has matched>suggested. Used by verify-pack-health. */
export function assertPolicyConsistency(): { ok: boolean; problems: string[] } {
  const problems: string[] = [];
  for (const [key, policy] of Object.entries(DOMAIN_POLICIES)) {
    if (!(policy.matched > policy.suggested)) {
      problems.push(`${key}: matched (${policy.matched}) <= suggested (${policy.suggested})`);
    }
    if (policy.matched > 1 || policy.suggested < 0) {
      problems.push(`${key}: thresholds out of range`);
    }
  }
  return { ok: problems.length === 0, problems };
}
