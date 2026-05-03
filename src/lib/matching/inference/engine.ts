import type { FieldType, FieldValue } from "@/lib/domain/types";
import type { IFieldRepository } from "@/lib/repositories/field-repository.interface";
import { normalizeText } from "@/lib/matching/normalize-text";
import { exactAliasMatchWithSignals } from "@/lib/matching/exact-alias-match";
import { exactValueMatchWithSignals } from "@/lib/matching/exact-value-match";
import { metadataCodeMatchWithSignals } from "@/lib/matching/metadata-code-match";
import { fuzzyMatchWithSignals } from "@/lib/matching/fuzzy-match";
import { validationMatchWithSignals } from "@/lib/matching/validation-match";
import { parserMatchWithSignals } from "@/lib/matching/parser-match";
import { contextSignalsFor } from "@/lib/matching/context-boost";
import { resolveEnumValuesCanonicalField } from "@/lib/matching/field-reference-resolver";
import { hierarchySignalsFor } from "@/lib/matching/inference/hierarchy";
import { loadPriors, priorSignalForValue, priorTotalForValueIds } from "@/lib/matching/inference/priors";
import type { ScoredCandidate, CandidateSignals } from "@/lib/matching/inference/scorer";
import { scoreCandidates } from "@/lib/matching/inference/scorer";
import type { PolicyDecision } from "@/lib/matching/inference/policy";
import { classifyWithPolicy, inferDomain } from "@/lib/matching/inference/policy";
import { buildExplain, emptyExplain, type ExplainV1 } from "@/lib/matching/inference/explain";
import type { Signal } from "@/lib/matching/inference/signal";

export type InferenceInput = {
  fieldKey: string;
  value: string;
  context?: Record<string, unknown>;
  organizationId?: string | null;
};

export type InferenceResult = {
  fieldKey: string;
  resolvedFieldKey: string;
  consumerFieldType: FieldType | null;
  resolvedFieldType: FieldType | null;
  normalizedInput: string;
  decision: PolicyDecision;
  winner: ScoredCandidate | null;
  alternates: ScoredCandidate[];
  scored: ScoredCandidate[];
  explain: ExplainV1;
  priorDecisionCount: number;
};

function mergeCandidates(streams: CandidateSignals[][]): CandidateSignals[] {
  const byId = new Map<string, CandidateSignals>();
  for (const stream of streams) {
    for (const candidate of stream) {
      const key = candidate.value.id;
      const existing = byId.get(key);
      if (!existing) {
        byId.set(key, { value: candidate.value, signals: [...candidate.signals] });
      } else {
        existing.signals.push(...candidate.signals);
      }
    }
  }
  return Array.from(byId.values());
}

async function annotateWithSoftSignals(args: {
  repo: IFieldRepository;
  resolvedFieldKey: string;
  normalizedInput: string;
  candidates: CandidateSignals[];
  context?: Record<string, unknown>;
}): Promise<CandidateSignals[]> {
  const enriched: CandidateSignals[] = [];
  for (const candidate of args.candidates) {
    const contextSignals = contextSignalsFor(args.resolvedFieldKey, candidate.value, args.context);
    const hierarchySignals = await hierarchySignalsFor(args.repo, candidate.value, args.normalizedInput);
    enriched.push({
      value: candidate.value,
      signals: [...candidate.signals, ...contextSignals, ...hierarchySignals],
    });
  }
  return enriched;
}

function attachPriorSignals(
  candidates: CandidateSignals[],
  priors: ReturnType<typeof loadPriors> extends Promise<infer T> ? T : never,
): CandidateSignals[] {
  return candidates.map((candidate) => {
    const priorSignal = priorSignalForValue(priors, candidate.value.id);
    if (!priorSignal) return candidate;
    return { value: candidate.value, signals: [...candidate.signals, priorSignal] };
  });
}

export async function runInference(input: InferenceInput, repo: IFieldRepository): Promise<InferenceResult> {
  const normalizedInput = normalizeText(input.value);
  const consumerFieldType = await repo.getFieldTypeByKey(input.fieldKey);
  const resolved = resolveEnumValuesCanonicalField(consumerFieldType);
  const resolvedFieldKey = resolved?.canonicalFieldKey ?? input.fieldKey;
  const resolvedFieldType = resolved
    ? await repo.getFieldTypeByKey(resolvedFieldKey)
    : consumerFieldType;
  const fieldTypeId = (resolvedFieldType ?? consumerFieldType)?.id ?? null;

  const matcherStreams = await Promise.all([
    exactAliasMatchWithSignals(repo, resolvedFieldKey, input.value, input.context),
    exactValueMatchWithSignals(repo, resolvedFieldKey, input.value),
    metadataCodeMatchWithSignals(repo, resolvedFieldKey, input.value),
    fuzzyMatchWithSignals(repo, resolvedFieldKey, input.value),
    Promise.resolve(validationMatchWithSignals(resolvedFieldKey, input.value, input.context)),
    Promise.resolve(parserMatchWithSignals(resolvedFieldKey, input.value, input.context)),
  ]);

  const merged = mergeCandidates(matcherStreams);
  const priors = await loadPriors(repo, fieldTypeId, normalizedInput);

  const enriched = await annotateWithSoftSignals({
    repo,
    resolvedFieldKey,
    normalizedInput,
    candidates: merged,
    context: input.context,
  });
  const withPriors = attachPriorSignals(enriched, priors);

  const scored = scoreCandidates(withPriors);
  const winner = scored[0] ?? null;
  const winnerScore = winner?.finalScore ?? 0;
  const decision = classifyWithPolicy(winnerScore, resolvedFieldKey);
  const policyDomain = inferDomain(resolvedFieldKey);

  const priorDecisionCount = priorTotalForValueIds(priors, winner ? [winner.value.id] : []);
  const lastDecisionAt = winner ? priors.lastByValueId.get(winner.value.id) ?? null : null;

  const explain = winner
    ? buildExplain({
        fieldKey: input.fieldKey,
        resolvedFieldKey,
        decision,
        winner,
        alternates: scored.slice(1),
        policyDomain,
        priorDecisionCount,
        lastDecisionAt,
      })
    : { ...emptyExplain(input.fieldKey, resolvedFieldKey), policy: { domain: policyDomain, thresholds: decision.thresholds, reason: decision.reason } };

  return {
    fieldKey: input.fieldKey,
    resolvedFieldKey,
    consumerFieldType,
    resolvedFieldType,
    normalizedInput,
    decision,
    winner,
    alternates: scored.slice(1, 5),
    scored,
    explain,
    priorDecisionCount,
  };
}

export type { Signal, FieldValue };
