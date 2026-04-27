import { normalizeTechnology } from "@/lib/packs/tech/technology-normalizer";

export async function normalizeVendor(input: string) {
  return normalizeTechnology(input);
}
