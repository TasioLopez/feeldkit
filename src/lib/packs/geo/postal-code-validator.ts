import { validateFieldValue } from "@/lib/validation/validation-service";

export function validatePostalCode(postalCode: string, country: string) {
  return validateFieldValue({
    field_key: "postal_codes",
    value: postalCode,
    context: { country },
  });
}
