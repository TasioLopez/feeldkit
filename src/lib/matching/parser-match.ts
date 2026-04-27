import { parseFieldValue } from "@/lib/parsing/parser-service";
import type { FieldValue } from "@/lib/domain/types";

export function parserMatch(
  fieldKey: string,
  input: string,
  context?: Record<string, unknown>,
): { value: FieldValue; confidence: number } | null {
  if (!["social_urls", "email_domains", "domains"].includes(fieldKey)) {
    return null;
  }
  const parsed = parseFieldValue({ field_key: fieldKey, value: input, context });
  const canonical = String(parsed.parsed.canonical_url ?? parsed.parsed.root_domain ?? "");
  if (!canonical) {
    return null;
  }
  return {
    value: {
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
      metadata: parsed.parsed,
      source: "runtime",
      sourceId: null,
    },
    confidence: 0.7,
  };
}
