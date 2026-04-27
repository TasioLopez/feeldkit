import { z } from "zod";
import type { ParseResult } from "@/lib/domain/types";

export const parsePayloadSchema = z.object({
  field_key: z.string(),
  value: z.string(),
  context: z.record(z.string(), z.unknown()).optional(),
});

function parseDomain(raw: string): Record<string, unknown> {
  const value = raw.trim().toLowerCase();
  const [localPart, domain] = value.includes("@") ? value.split("@") : ["", value];
  const labels = domain.split(".").filter(Boolean);
  const rootDomain = labels.slice(-2).join(".");
  const subdomain = labels.length > 2 ? labels.slice(0, -2).join(".") : null;
  return { local_part: localPart || null, domain, root_domain: rootDomain, subdomain };
}

function parseSocialUrl(raw: string): Record<string, unknown> {
  const url = new URL(raw);
  const pathParts = url.pathname.split("/").filter(Boolean);
  const platform = url.hostname.includes("linkedin") ? "linkedin" : "unknown";
  return {
    platform,
    entity_type: pathParts[0] ?? null,
    handle: pathParts[1] ?? null,
    canonical_url: `${url.protocol}//${url.hostname}/${pathParts.slice(0, 2).join("/")}`,
  };
}

function parseUtm(raw: string): Record<string, unknown> {
  const params = new URLSearchParams(raw.startsWith("?") ? raw.slice(1) : raw);
  return {
    utm_source: params.get("utm_source"),
    utm_medium: params.get("utm_medium"),
    utm_campaign: params.get("utm_campaign"),
    utm_term: params.get("utm_term"),
    utm_content: params.get("utm_content"),
  };
}

export function parseFieldValue(input: z.infer<typeof parsePayloadSchema>): ParseResult {
  if (input.field_key === "domains" || input.field_key === "email_domains") {
    return { fieldKey: input.field_key, input: input.value, parsed: parseDomain(input.value) };
  }
  if (input.field_key === "social_urls") {
    return { fieldKey: input.field_key, input: input.value, parsed: parseSocialUrl(input.value) };
  }
  if (input.field_key === "utm_parameters") {
    return { fieldKey: input.field_key, input: input.value, parsed: parseUtm(input.value) };
  }
  return { fieldKey: input.field_key, input: input.value, parsed: { raw: input.value } };
}
