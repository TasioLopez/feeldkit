import type { AiProvider, EnrichmentPrompt, EnrichmentSuggestion } from "@/lib/ai/provider";

type OpenAIResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

function extractJsonArray(raw: string): EnrichmentSuggestion[] {
  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw.slice(start, end + 1)) as Array<{
      key?: string;
      label?: string;
      confidence?: number;
      reasoning?: string;
    }>;
    return parsed
      .filter((item) => item.key && item.label)
      .map((item) => ({
        key: item.key as string,
        label: item.label as string,
        confidence: Math.min(1, Math.max(0, Number(item.confidence ?? 0.65))),
        reasoning: (item.reasoning as string) ?? "AI-generated suggestion",
      }));
  } catch {
    return [];
  }
}

export class OpenAIProvider implements AiProvider {
  readonly name = "openai";
  readonly model: string;

  constructor(
    private readonly apiKey: string,
    model = process.env.FEELDKIT_AI_MODEL ?? "gpt-4.1-mini",
  ) {
    this.model = model;
  }

  async suggest(prompt: EnrichmentPrompt): Promise<EnrichmentSuggestion[]> {
    const system =
      "You are a data normalization assistant. Return only JSON array. Each item: {key,label,confidence,reasoning}.";
    const user = [
      `Field key: ${prompt.fieldKey}`,
      `Field name: ${prompt.fieldName}`,
      `Input value: ${prompt.input}`,
      `Max suggestions: ${prompt.limit}`,
      `Existing labels (avoid duplicates): ${prompt.existingLabels.slice(0, 200).join(", ")}`,
    ].join("\n");

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content:
              `${user}\nReturn format: {"suggestions":[{"key":"...","label":"...","confidence":0.0-1.0,"reasoning":"..."}]}`,
          },
        ],
      }),
    });
    if (!res.ok) {
      return [];
    }
    const payload = (await res.json()) as OpenAIResponse;
    const content = payload.choices?.[0]?.message?.content ?? "";
    try {
      const parsed = JSON.parse(content) as { suggestions?: Array<Record<string, unknown>> };
      const suggestions = parsed.suggestions ?? [];
      return suggestions
        .filter((item) => typeof item.key === "string" && typeof item.label === "string")
        .map((item) => ({
          key: item.key as string,
          label: item.label as string,
          confidence: Math.min(1, Math.max(0, Number(item.confidence ?? 0.65))),
          reasoning: (item.reasoning as string) ?? "AI-generated suggestion",
        }))
        .slice(0, prompt.limit);
    } catch {
      return extractJsonArray(content).slice(0, prompt.limit);
    }
  }
}
