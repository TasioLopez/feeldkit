import { z } from "zod";

/**
 * `feeldkit.flow_pack.v1` — authored JSON contract for deterministic source -> target mappings.
 *
 * Files live at `src/data/flows/*.flow.json` and are ingested into Postgres by
 * `scripts/ingest-flows.ts`. Each version of a flow pack is immutable; bumping
 * `version` produces a new `flow_pack_versions` row.
 */
export const FLOW_PACK_CONTRACT_V1 = "feeldkit.flow_pack.v1" as const;

export const flowTransformSchema = z.object({
  op: z.enum(["copy", "lower", "upper", "trim", "regex_replace", "split_join"]),
  params: z.record(z.string(), z.unknown()).optional(),
});

export type FlowTransform = z.infer<typeof flowTransformSchema>;

export const flowDirectMappingSchema = z.object({
  kind: z.literal("direct"),
  source_field_key: z.string().min(1),
  target_field_key: z.string().min(1),
  transform: flowTransformSchema.optional(),
  is_required: z.boolean().default(false),
});

export const flowTranslateOptionsSchema = z
  .object({
    require_deterministic: z.boolean().default(true),
    min_confidence: z.number().min(0).max(1).default(0.95),
  })
  .partial()
  .default({});

export const flowTranslateMappingSchema = z.object({
  kind: z.literal("translate"),
  source_field_key: z.string().min(1),
  target_field_key: z.string().min(1),
  options: flowTranslateOptionsSchema.optional(),
  is_required: z.boolean().default(false),
});

export const flowFieldMappingSchema = z.discriminatedUnion("kind", [
  flowDirectMappingSchema,
  flowTranslateMappingSchema,
]);

export type FlowDirectMapping = z.infer<typeof flowDirectMappingSchema>;
export type FlowTranslateMapping = z.infer<typeof flowTranslateMappingSchema>;
export type FlowFieldMappingDef = z.infer<typeof flowFieldMappingSchema>;

export const flowPackV1Schema = z.object({
  contract: z.literal(FLOW_PACK_CONTRACT_V1),
  key: z
    .string()
    .min(1)
    .regex(/^[a-z0-9_]+$/, "flow pack key must be lower_snake_case"),
  name: z.string().min(1),
  description: z.string().default(""),
  source_system: z.string().min(1),
  target_system: z.string().min(1),
  version: z
    .string()
    .min(1)
    .regex(/^\d+\.\d+\.\d+$/, "version must be semver MAJOR.MINOR.PATCH"),
  changelog: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  field_mappings: z.array(flowFieldMappingSchema).min(1),
});

export type FlowPackV1 = z.infer<typeof flowPackV1Schema>;

/**
 * Effective (resolved) options for a translate mapping after defaults applied.
 * Centralized so runtime + ingest report agree on what the rule actually does.
 */
export function resolveTranslateOptions(mapping: FlowTranslateMapping): {
  requireDeterministic: boolean;
  minConfidence: number;
} {
  const opts = mapping.options ?? {};
  return {
    requireDeterministic: opts.require_deterministic ?? true,
    minConfidence: opts.min_confidence ?? 0.95,
  };
}
