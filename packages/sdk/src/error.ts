/**
 * Thrown when the FeeldKit API responds with a non-2xx status. The original
 * parsed body is preserved on `body` for inspection (often `{ error, details }`).
 */
export class FeeldKitApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "FeeldKitApiError";
    this.status = status;
    this.body = body;
  }
}
