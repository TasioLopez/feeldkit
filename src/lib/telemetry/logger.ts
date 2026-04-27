export function logApiRequest(info: {
  requestId?: string;
  method: string;
  pathname: string;
  apiKeyId?: string;
  status: number;
  durationMs: number;
}): void {
  const line = {
    level: "info",
    type: "api_request",
    ...info,
    ts: new Date().toISOString(),
  };
  console.log(JSON.stringify(line));
}
