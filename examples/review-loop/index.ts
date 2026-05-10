import { FeeldKitClient } from "@feeldkit/sdk";

const proposalId = process.env.FEELDKIT_PROPOSAL_ID;
if (!proposalId) {
  throw new Error("Set FEELDKIT_PROPOSAL_ID to an enrichment proposal that is safe to undo/replay.");
}

const client = new FeeldKitClient({
  apiKey: process.env.FEELDKIT_API_KEY!,
  baseUrl: process.env.FEELDKIT_BASE_URL ?? "http://localhost:3000",
});

const undo = await client.admin.proposals.undo(proposalId, {
  notes: "review-loop example smoke",
});
console.log(JSON.stringify(undo, null, 2));

const versions = await client.promotedIntelligence.versions({ limit: 5 });
console.log(`registry_versions=${versions.versions.length}`);
