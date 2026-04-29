export type EnrichmentSuggestion = {
  key: string;
  label: string;
  confidence: number;
  reasoning: string;
};

export type EnrichmentPrompt = {
  fieldKey: string;
  fieldName: string;
  input: string;
  existingLabels: string[];
  limit: number;
};

export interface AiProvider {
  readonly name: string;
  readonly model: string;
  suggest(prompt: EnrichmentPrompt): Promise<EnrichmentSuggestion[]>;
}
