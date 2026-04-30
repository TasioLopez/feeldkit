import type { FieldType } from "@/lib/domain/types";
import { parseCanonicalRefV1 } from "@/lib/domain/canonical-ref";

export type ResolvedCanonicalTarget = {
  canonicalFieldKey: string;
  packKey: string;
  relationship: "enum_values" | "crosswalk" | "concept_layer";
};

/**
 * If `fieldType` declares `feeldkit.canonical_ref.v1` with `enum_values`, return the canonical `field_types.key` to match against.
 */
export function resolveEnumValuesCanonicalField(fieldType: FieldType | null): ResolvedCanonicalTarget | null {
  if (!fieldType) return null;
  const ref = parseCanonicalRefV1(fieldType.metadataSchema);
  if (!ref || ref.relationship !== "enum_values") {
    return null;
  }
  return {
    canonicalFieldKey: ref.field_type_key,
    packKey: ref.pack_key,
    relationship: ref.relationship,
  };
}
