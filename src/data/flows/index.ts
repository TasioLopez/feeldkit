import linkedinSalesnavToHubspot from "@/data/flows/linkedin-salesnav-to-hubspot.flow.json";
import type { FlowPackV1 } from "@/lib/flows/schema";

/**
 * Flow pack JSON files in this directory are the authored source of truth for
 * Phase 3 deterministic flows. Each entry must conform to `feeldkit.flow_pack.v1`
 * (see `src/lib/flows/schema.ts`). `scripts/ingest-flows.ts` reads this list to
 * validate and ingest into Postgres.
 */
export const flowDefinitions: FlowPackV1[] = [linkedinSalesnavToHubspot as FlowPackV1];
