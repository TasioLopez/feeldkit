import { parseFieldValue } from "@/lib/parsing/parser-service";

export function classifyDomain(input: string) {
  const parsed = parseFieldValue({ field_key: "domains", value: input });
  return {
    input,
    ...parsed.parsed,
  };
}
