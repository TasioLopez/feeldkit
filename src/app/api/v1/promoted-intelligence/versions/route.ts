import { NextResponse } from "next/server";
import { createScopedHandler } from "@/lib/api/endpoint";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export const GET = createScopedHandler("read:promoted-intelligence", async (request) => {
  const url = new URL(request.url);
  const limitRaw = Number(url.searchParams.get("limit") ?? "50");
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(1, limitRaw), 200) : 50;

  const admin = getSupabaseServiceClient();
  if (!admin) {
    return NextResponse.json({ error: "server_misconfigured" }, { status: 500 });
  }

  const { data, error } = await admin
    .from("promoted_intelligence_versions")
    .select("id, version, generated_at, changelog, stats")
    .order("generated_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    versions: (data ?? []).map((row) => ({
      id: row.id,
      version: row.version,
      generated_at: row.generated_at,
      changelog: row.changelog,
      stats: row.stats,
    })),
    limit,
  });
});
