import { NextResponse } from "next/server";
import { createScopedHandler } from "@/lib/api/endpoint";
import { retireFlowPackVersion } from "@/lib/flows/lifecycle";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export const POST = createScopedHandler("admin:flows", async (req) => {
  const organizationId = req.headers.get("x-feeldkit-organization-id");
  const actorId = req.headers.get("x-feeldkit-api-key-id");
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  const flowKey = segments[4];
  const version = segments[6];
  const tail = segments[7];
  if (!flowKey || !version || tail !== "retire") {
    return NextResponse.json({ error: "invalid_path" }, { status: 400 });
  }

  const admin = getSupabaseServiceClient();
  if (!admin) {
    return NextResponse.json({ error: "server_misconfigured" }, { status: 500 });
  }

  const result = await retireFlowPackVersion(admin, {
    flowKey,
    version,
    organizationId,
    actorId,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "retire_failed" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
});
