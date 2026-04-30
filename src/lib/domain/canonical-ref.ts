import { z } from "zod";

/** Stored on `field_types.metadata_schema` (jsonb). */
export const FEELDKIT_CANONICAL_REF_V1 = "feeldkit.canonical_ref.v1" as const;

/** When true on `metadata_schema`, seed ingestion must not overwrite this row's metadata. */
export const FEELDKIT_METADATA_LOCK = "feeldkit.metadata_lock" as const;

export const canonicalRefRelationshipSchema = z.enum(["enum_values", "crosswalk", "concept_layer"]);

export const canonicalRefV1Schema = z.object({
  pack_key: z.string().min(1),
  field_type_key: z.string().min(1),
  relationship: canonicalRefRelationshipSchema,
  transform: z
    .object({
      code_system: z.string().optional(),
      prefer_metadata_key: z.string().optional(),
    })
    .optional(),
});

export type CanonicalRefV1 = z.infer<typeof canonicalRefV1Schema>;

export function parseCanonicalRefV1(metadataSchema: Record<string, unknown> | null | undefined): CanonicalRefV1 | null {
  if (!metadataSchema) return null;
  const raw = metadataSchema[FEELDKIT_CANONICAL_REF_V1];
  if (!raw || typeof raw !== "object") return null;
  const parsed = canonicalRefV1Schema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export function buildCanonicalRefV1(ref: CanonicalRefV1): Record<string, unknown> {
  return { [FEELDKIT_CANONICAL_REF_V1]: ref };
}
