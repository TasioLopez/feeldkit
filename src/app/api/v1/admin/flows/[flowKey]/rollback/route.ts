import { NextResponse } from "next/server";
import { z } from "zod";
import { createScopedHandler } from "@/lib/api/endpoint";
import { rollbackFlowToVersion } from "@/lib/flows/lifecycle";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  version: z.string().min(1),
});

export const POST = createScopedHandler("admin:flows", async (request) => {
  const organizationId = request.headers.get("x-feeldkit-organization-id");
  const actorId = request.headers.get("x-feeldkit-api-key-id");
  const segments = new URL(request.url).pathname.split("/").filter(Boolean);
  const flowKey = segments[4];
  if (!flowKey || segments[5] !== "rollback") {
    return NextResponse.json({ error: "invalid_path" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const admin = getSupabaseServiceClient();
  if (!admin) {
    return NextResponse.json({ error: "server_misconfigured" }, { status: 500 });
  }

  const result = await rollbackFlowToVersion(admin, {
    flowKey,
    targetVersion: parsed.data.version,
    organizationId,
    actorId,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "rollback_failed" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
});
