import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/auth/api-key-service";
import { requireScope, type ApiScope } from "@/lib/auth/api-key";

export async function withApiScope(request: Request, scope: ApiScope) {
  const apiKey = request.headers.get("x-api-key");
  if (!apiKey) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "missing x-api-key header" }, { status: 401 }),
    };
  }

  const authenticated = await authenticateApiKey(apiKey);
  if (!authenticated) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "invalid API key" }, { status: 401 }),
    };
  }

  if (!requireScope(authenticated, scope)) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "insufficient scope" }, { status: 403 }),
    };
  }

  return { ok: true as const, apiKey: authenticated };
}
