import { parseFieldValue } from "@/lib/parsing/parser-service";
import type { FieldValue } from "@/lib/domain/types";
import type { CandidateSignals } from "@/lib/matching/inference/scorer";
import { makeSignal } from "@/lib/matching/inference/signal";
import { DEFAULT_WEIGHTS } from "@/lib/matching/inference/weights";

const PARSER_CONFIDENCE = 0.7;
const PARSER_FIELD_KEYS = ["social_urls", "email_domains", "domains"] as const;

function buildPlaceholderValue(canonical: string, parsed: Record<string, unknown>): FieldValue {
  return {
    id: crypto.randomUUID(),
    fieldTypeId: "parser-only",
    key: canonical,
    label: canonical,
    normalizedLabel: canonical,
    locale: null,
    description: null,
    parentId: null,
    sortOrder: 0,
    status: "active",
    metadata: parsed,
    source: "runtime",
    sourceId: null,
  };
}

export function parserMatch(
  fieldKey: string,
  input: string,
  context?: Record<string, unknown>,
): { value: FieldValue; confidence: number } | null {
  if (!(PARSER_FIELD_KEYS as readonly string[]).includes(fieldKey)) {
    return null;
  }
  const parsed = parseFieldValue({ field_key: fieldKey, value: input, context });
  const canonical = String(parsed.parsed.canonical_url ?? parsed.parsed.root_domain ?? "");
  if (!canonical) {
    return null;
  }
  return { value: buildPlaceholderValue(canonical, parsed.parsed), confidence: PARSER_CONFIDENCE };
}

export function parserMatchWithSignals(
  fieldKey: string,
  input: string,
  context?: Record<string, unknown>,
): CandidateSignals[] {
  const match = parserMatch(fieldKey, input, context);
  if (!match) return [];
  return [
    {
      value: match.value,
      signals: [
        makeSignal({
          kind: "parser",
          source: "parser-service",
          rawScore: PARSER_CONFIDENCE,
          weight: DEFAULT_WEIGHTS.parser,
          metadata: { field_key: fieldKey },
        }),
      ],
    },
  ];
}
