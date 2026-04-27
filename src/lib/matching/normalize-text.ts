const DIACRITICS = /[\u0300-\u036f]/g;
const SPACES = /\s+/g;
const PUNCTUATION = /[^a-z0-9\s.+@_-]/g;

export function normalizeText(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(DIACRITICS, "")
    .replace(PUNCTUATION, " ")
    .replace(SPACES, " ")
    .trim();
}

export function tokenSet(input: string): Set<string> {
  const normalized = normalizeText(input);
  if (!normalized) {
    return new Set();
  }
  return new Set(normalized.split(" "));
}
