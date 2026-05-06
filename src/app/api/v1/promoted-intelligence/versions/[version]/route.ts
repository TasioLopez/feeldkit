import { NextResponse } from "next/server";
import { createScopedHandler } from "@/lib/api/endpoint";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export const GET = createScopedHandler("read:promoted-intelligence", async (request) => {
  const segments = new URL(request.url).pathname.split("/").filter(Boolean);
  const version = segments[segments.length - 1];
  if (!version) {
    return NextResponse.json({ error: "invalid_path" }, { status: 400 });
  }

  const admin = getSupabaseServiceClient();
  if (!admin) {
    return NextResponse.json({ error: "server_misconfigured" }, { status: 500 });
  }

  const { data: versionRow, error: versionErr } = await admin
    .from("promoted_intelligence_versions")
    .select("id, version, generated_at, changelog, stats")
    .eq("version", version)
    .maybeSingle();
  if (versionErr) {
    return NextResponse.json({ error: versionErr.message }, { status: 500 });
  }
  if (!versionRow) {
    return NextResponse.json({ error: "version_not_found" }, { status: 404 });
  }

  const { data: entries } = await admin
    .from("promoted_intelligence_entries")
    .select("id, target_table, target_id, action, payload, created_at")
    .eq("version_id", versionRow.id as string)
    .order("created_at", { ascending: true })
    .limit(2000);

  return NextResponse.json({
    version: versionRow.version,
    generated_at: versionRow.generated_at,
    changelog: versionRow.changelog,
    stats: versionRow.stats,
    entries: entries ?? [],
  });
});
