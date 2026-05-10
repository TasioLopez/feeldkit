import { NextResponse } from "next/server";
import { z } from "zod";
import { createMultiScopedHandler } from "@/lib/api/endpoint";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { importOrgConfigProfile } from "@/lib/profiles/import";
import { ORG_CONFIG_PROFILE_SCHEMA } from "@/lib/profiles/types";

const importBodySchema = z.object({
  profile: z.object({
    schema: z.literal(ORG_CONFIG_PROFILE_SCHEMA),
    manifest: z.object({
      exported_at: z.string(),
      source_organization_id: z.string(),
      feeldkit_app_version: z.string().nullable(),
      schema_version: z.literal(1),
    }),
    promotion_settings: z.object({
      default_scope: z.enum(["org", "global"]),
      opt_out_global_propose: z.boolean(),
      notes: z.string().nullable(),
    }),
    policy_overrides: z.array(
      z.object({
        domain: z.string(),
        matched: z.number(),
        suggested: z.number(),
        notes: z.string().nullable(),
      }),
    ),
    field_locks: z.array(
      z.object({
        field_key: z.string(),
        mode: z.enum(["require_review", "disable_auto_apply"]),
        reason: z.string().nullable(),
      }),
    ),
    flow_pack_overrides: z.array(
      z.object({
        flow_key: z.string(),
        flow_pack_version: z.string().nullable(),
        ordinal: z.number().int().nullable(),
        action: z.enum(["skip", "replace", "lock", "pin_version"]),
        payload: z.record(z.string(), z.unknown()),
        notes: z.string().nullable(),
      }),
    ),
  }),
  dry_run: z.boolean().optional().default(false),
});

export const POST = createMultiScopedHandler(
  ["admin:policies", "admin:flows", "admin:promotions"],
  async (request) => {
    const organizationId = request.headers.get("x-feeldkit-organization-id");
    const actorId = request.headers.get("x-feeldkit-api-key-id");
    if (!organizationId) {
      return NextResponse.json(
        { error: "API key is not scoped to an organization" },
        { status: 400 },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }
    const parsed = importBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "validation_failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const admin = getSupabaseServiceClient();
    if (!admin) {
      return NextResponse.json({ error: "server_misconfigured" }, { status: 500 });
    }

    const result = await importOrgConfigProfile(admin, {
      organizationId,
      actorId,
      profile: parsed.data.profile,
      dryRun: parsed.data.dry_run,
    });

    return NextResponse.json(result);
  },
);
