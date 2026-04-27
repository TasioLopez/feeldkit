import { parseFieldValue } from "@/lib/parsing/parser-service";

export function parseDomain(input: string) {
  return parseFieldValue({ field_key: "domains", value: input });
}
