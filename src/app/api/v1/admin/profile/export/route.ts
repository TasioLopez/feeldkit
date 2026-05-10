import { NextResponse } from "next/server";
import { createMultiScopedHandler } from "@/lib/api/endpoint";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { exportOrgConfigProfile } from "@/lib/profiles/export";
import { writeAudit } from "@/lib/governance/audit";

export const GET = createMultiScopedHandler(
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
    const admin = getSupabaseServiceClient();
    if (!admin) {
      return NextResponse.json({ error: "server_misconfigured" }, { status: 500 });
    }

    const profile = await exportOrgConfigProfile(admin, organizationId);

    await writeAudit({
      organizationId,
      actorId,
      action: "profile.export",
      entityType: "org_config_profile",
      entityId: null,
      after: { manifest: profile.manifest },
    });

    return NextResponse.json({ profile });
  },
);
