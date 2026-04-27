import { normalizeText } from "@/lib/matching/normalize-text";

export function normalizeLocale(input: string) {
  const normalized = normalizeText(input).replace(/\s+/g, "-");
  const guessed = normalized.includes("-") ? normalized : `${normalized}-nl`;
  return { field_key: "locales", input, locale: guessed };
}
