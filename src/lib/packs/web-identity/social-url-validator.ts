import { validateFieldValue } from "@/lib/validation/validation-service";

export function validateSocialUrl(input: string) {
  return validateFieldValue({ field_key: "social_urls", value: input });
}
