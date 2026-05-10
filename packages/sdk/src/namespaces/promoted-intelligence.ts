import type { Transport } from "../transport";
import type { PromotedIntelligenceEntry, PromotedIntelligenceVersion } from "../types";

export class PromotedIntelligenceNamespace {
  constructor(private readonly transport: Transport) {}

  versions(opts: { limit?: number; offset?: number } = {}): Promise<{
    versions: PromotedIntelligenceVersion[];
    total: number;
  }> {
    return this.transport.request("GET", "/api/v1/promoted-intelligence/versions", {
      query: { limit: opts.limit, offset: opts.offset },
    });
  }

  version(version: string): Promise<{
    version: PromotedIntelligenceVersion;
    entries: PromotedIntelligenceEntry[];
  }> {
    return this.transport.request(
      "GET",
      `/api/v1/promoted-intelligence/versions/${encodeURIComponent(version)}`,
    );
  }
}
