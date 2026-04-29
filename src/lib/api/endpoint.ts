import { NextResponse } from "next/server";
import { withApiScope } from "@/lib/auth/require-api-scope";
import { touchApiKeyLastUsedThrottled } from "@/lib/auth/api-key-last-used";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { logUsageEvent } from "@/lib/telemetry/usage-events";
import { logApiRequest } from "@/lib/telemetry/logger";
import type { ApiScope } from "@/lib/auth/api-key";

export function createScopedHandler(
  scope: ApiScope,
  handler: (request: Request) => Promise<Response> | Response,
): (request: Request) => Promise<Response> {
  return async (request: Request) => {
    const started = Date.now();
    const url = new URL(request.url);
    const requestId = request.headers.get("x-request-id") ?? undefined;
    const auth = await withApiScope(request, scope);
    if (!auth.ok) {
      logApiRequest({
        requestId,
        method: request.method,
        pathname: url.pathname,
        status: auth.response.status,
        durationMs: Date.now() - started,
      });
      return auth.response;
    }
    const rateKey = `${auth.apiKey.id}:${url.pathname}`;
    if (!checkRateLimit(rateKey)) {
      const res = NextResponse.json({ error: "rate limit exceeded" }, { status: 429 });
      logApiRequest({
        requestId,
        method: request.method,
        pathname: url.pathname,
        apiKeyId: auth.apiKey.id,
        status: 429,
        durationMs: Date.now() - started,
      });
      return res;
    }
    const requestWithContext = new Request(request, {
      headers: new Headers(request.headers),
    });
    requestWithContext.headers.set("x-feeldkit-api-key-id", auth.apiKey.id);
    if (auth.apiKey.organizationId) {
      requestWithContext.headers.set("x-feeldkit-organization-id", auth.apiKey.organizationId);
    }
    const response = await handler(requestWithContext);
    const fieldKey = url.searchParams.get("fieldKey") ?? null;
    touchApiKeyLastUsedThrottled(auth.apiKey.id);
    void logUsageEvent({
      organizationId: auth.apiKey.organizationId,
      apiKeyId: auth.apiKey.id,
      endpoint: url.pathname,
      fieldKey,
    });
    logApiRequest({
      requestId,
      method: request.method,
      pathname: url.pathname,
      apiKeyId: auth.apiKey.id,
      status: response.status,
      durationMs: Date.now() - started,
    });
    return response;
  };
}
