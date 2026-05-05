import type { IGovernanceRepository } from "@/lib/governance/governance-repository.interface";
import type { OrgFieldLock } from "@/lib/governance/types";
import type { PolicyDecision } from "@/lib/matching/inference/policy";
import type { DomainKey } from "@/lib/matching/inference/weights";
import { DOMAIN_POLICIES, inferDomain } from "@/lib/matching/inference/policy";

export type EffectivePolicyResolution = {
  domain: DomainKey;
  thresholds: { matched: number; suggested: number };
  thresholdsSource: "default" | "org_override";
  /** When an org row exists but cannot be applied safely */
  overrideIgnoredReason?: string;
  fieldLock: OrgFieldLock | null;
};

function isFiniteThreshold(matched: number, suggested: number): boolean {
  return Number.isFinite(matched) && Number.isFinite(suggested);
}

function isConsistentPolicy(matched: number, suggested: number): boolean {
  return matched > suggested && matched <= 1 && suggested >= 0;
}

/**
 * Resolve per-domain confidence thresholds for a field key, layering org overrides
 * on top of coded defaults. Wave 1: read-only — the inference engine still uses
 * {@link classifyWithPolicy} with global defaults until Wave 2.
 */
export async function resolveEffectivePolicy(
  repo: IGovernanceRepository,
  organizationId: string | null | undefined,
  fieldKey: string,
): Promise<EffectivePolicyResolution> {
  const domain = inferDomain(fieldKey);
  const base = DOMAIN_POLICIES[domain] ?? DOMAIN_POLICIES.default;

  let thresholdsSource: EffectivePolicyResolution["thresholdsSource"] = "default";
  let thresholds = { matched: base.matched, suggested: base.suggested };
  let overrideIgnoredReason: string | undefined;

  if (organizationId) {
    const row = await repo.getOrgPolicyOverride(organizationId, domain);
    if (row) {
      const matched = row.matched;
      const suggested = row.suggested;
      if (!isFiniteThreshold(matched, suggested)) {
        overrideIgnoredReason = "override_thresholds_not_finite";
      } else if (!isConsistentPolicy(matched, suggested)) {
        overrideIgnoredReason = "override_thresholds_inconsistent";
      } else {
        thresholds = { matched, suggested };
        thresholdsSource = "org_override";
      }
    }
  }

  const fieldLock =
    organizationId ? await repo.getOrgFieldLock(organizationId, fieldKey) : null;

  return {
    domain,
    thresholds,
    thresholdsSource,
    overrideIgnoredReason,
    fieldLock,
  };
}

/** Classify a score using resolved org thresholds + optional field locks (Wave 2 runtime). */
export function classifyWithEffectivePolicy(score: number, effective: EffectivePolicyResolution): PolicyDecision {
  const matched = effective.thresholds.matched;
  const suggested = effective.thresholds.suggested;
  const domainLabel = effective.domain;

  let decision: PolicyDecision;
  if (score >= matched) {
    decision = {
      status: "matched",
      needsReview: false,
      band: "high",
      thresholds: { matched, suggested },
      reason: `score>=${matched.toFixed(2)} for domain=${domainLabel}`,
    };
  } else if (score >= suggested) {
    decision = {
      status: "suggested",
      needsReview: false,
      band: "mid",
      thresholds: { matched, suggested },
      reason: `score>=${suggested.toFixed(2)} for domain=${domainLabel}`,
    };
  } else {
    decision = {
      status: "review",
      needsReview: true,
      band: "low",
      thresholds: { matched, suggested },
      reason: `score<${suggested.toFixed(2)} for domain=${domainLabel}`,
    };
  }

  if (effective.fieldLock?.mode === "disable_auto_apply" && decision.status === "matched") {
    decision = {
      ...decision,
      status: "suggested",
      band: "mid",
      reason: `${decision.reason}; field_lock=disable_auto_apply`,
    };
  }
  if (effective.fieldLock?.mode === "require_review") {
    decision = {
      ...decision,
      needsReview: true,
      reason: `${decision.reason}; field_lock=require_review`,
    };
  }
  return decision;
}
