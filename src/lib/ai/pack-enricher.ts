import { normalizeText } from "@/lib/matching/normalize-text";
import type { EnrichmentSuggestion } from "@/lib/ai/provider";
import { HeuristicProvider } from "@/lib/ai/heuristic-provider";
import { OpenAIProvider } from "@/lib/ai/openai-provider";

function createProvider() {
  const openAiKey = process.env.OPENAI_API_KEY;
  if (openAiKey) {
    return new OpenAIProvider(openAiKey);
  }
  return new HeuristicProvider();
}

export async function suggestPackEnrichments(args: {
  fieldKey: string;
  fieldName: string;
  input: string;
  existingLabels: string[];
  limit?: number;
}): Promise<{ provider: string; model: string; suggestions: EnrichmentSuggestion[] }> {
  const provider = createProvider();
  const limit = Math.min(Math.max(args.limit ?? 3, 1), 10);
  const normalizedInput = normalizeText(args.input);
  if (!normalizedInput) {
    return { provider: provider.name, model: provider.model, suggestions: [] };
  }

  const suggestions = await provider.suggest({
    fieldKey: args.fieldKey,
    fieldName: args.fieldName,
    input: args.input,
    existingLabels: args.existingLabels,
    limit,
  });

  const deduped = new Map<string, EnrichmentSuggestion>();
  for (const suggestion of suggestions) {
    const normalizedLabel = normalizeText(suggestion.label);
    if (!normalizedLabel) continue;
    if (!deduped.has(normalizedLabel)) {
      deduped.set(normalizedLabel, suggestion);
    }
  }

  return {
    provider: provider.name,
    model: provider.model,
    suggestions: [...deduped.values()].slice(0, limit),
  };
}
