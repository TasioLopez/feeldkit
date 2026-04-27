import { validateFieldValue } from "@/lib/validation/validation-service";

export function validateUtm(input: string) {
  return validateFieldValue({ field_key: "utm_parameters", value: input });
}
