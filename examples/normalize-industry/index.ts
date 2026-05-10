import { FeeldKitClient } from "@feeldkit/sdk";

const client = new FeeldKitClient({
  apiKey: process.env.FEELDKIT_API_KEY ?? "fk_demo_public_1234567890",
  baseUrl: process.env.FEELDKIT_BASE_URL ?? "http://localhost:3000",
});

const result = await client.normalize.one({
  fieldKey: "company_industry",
  value: process.argv[2] ?? "computer software",
});

console.log(JSON.stringify({
  label: result.match?.label,
  confidence: result.confidence,
  needs_review: result.needs_review,
  explain_status: result.explain.decision.status,
}, null, 2));
