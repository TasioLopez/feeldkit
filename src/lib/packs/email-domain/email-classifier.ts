import { parseFieldValue } from "@/lib/parsing/parser-service";
import { getFieldRepository } from "@/lib/repositories/get-field-repository";

export async function classifyEmail(input: string) {
  const parsed = parseFieldValue({ field_key: "email_domains", value: input });
  const domain = String(parsed.parsed.domain ?? "");
  const localPart = String(parsed.parsed.local_part ?? "");
  const repo = getFieldRepository();
  const freeProviders = (await repo.getValuesByFieldKey("free_email_providers")).map((entry) => entry.label);
  const roleBased = (await repo.getValuesByFieldKey("role_based_local_parts")).map((entry) => entry.label);

  const isFree = freeProviders.includes(domain);
  const isRoleBased = roleBased.includes(localPart);

  return {
    input,
    domain,
    local_part: localPart,
    classification: {
      is_free_provider: isFree,
      is_disposable: false,
      is_role_based: isRoleBased,
      likely_work_email: !isFree,
    },
    matches: {
      free_provider: isFree ? domain : null,
      role_based_local_part: isRoleBased ? localPart : null,
    },
  };
}
