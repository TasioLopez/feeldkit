import { ADDRESS_TEMPLATES_BY_ISO2 } from "@/data/generated/address-templates";

export function getAddressTemplate(countryIso2: string) {
  return ADDRESS_TEMPLATES_BY_ISO2[countryIso2.toUpperCase()] ?? null;
}
