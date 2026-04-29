import { normalizeText } from "@/lib/matching/normalize-text";
import type { AiProvider, EnrichmentPrompt, EnrichmentSuggestion } from "@/lib/ai/provider";

function toKey(input: string): string {
  return normalizeText(input).replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "").slice(0, 80) || "suggested_value";
}

function toLabel(input: string): string {
  const cleaned = input.trim().replace(/\s+/g, " ");
  return cleaned
    .split(" ")
    .map((part) => (part ? `${part[0].toUpperCase()}${part.slice(1).toLowerCase()}` : part))
    .join(" ");
}

export class HeuristicProvider implements AiProvider {
  readonly name = "heuristic";
  readonly model = "rule-based-v1";

  async suggest(prompt: EnrichmentPrompt): Promise<EnrichmentSuggestion[]> {
    const key = toKey(prompt.input);
    const label = toLabel(prompt.input);
    const hasNearMatch = prompt.existingLabels.some((existing) => normalizeText(existing) === normalizeText(label));
    if (hasNearMatch) {
      return [];
    }
    return [
      {
        key,
        label,
        confidence: 0.45,
        reasoning: `Heuristic suggestion for ${prompt.fieldName} from normalized input.`,
      },
    ].slice(0, Math.max(1, prompt.limit));
  }
}
