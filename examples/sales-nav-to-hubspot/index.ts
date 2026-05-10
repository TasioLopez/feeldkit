import { FeeldKitClient } from "@feeldkit/sdk";

const client = new FeeldKitClient({
  apiKey: process.env.FEELDKIT_API_KEY ?? "fk_demo_public_1234567890",
  baseUrl: process.env.FEELDKIT_BASE_URL ?? "http://localhost:3000",
});

const result = await client.flows.translate({
  flowKey: "linkedin_salesnav__hubspot",
  sourceRecord: {
    full_name: "Ada Lovelace",
    company_name: "FeeldKit",
    company_industry: "Computer Software",
    company_country: "NL",
  },
});

console.log(`flow=${result.flow.key}@${result.flow.version} status=${result.status}`);
for (const field of result.fields) {
  console.log(`${field.target_field_key}: ${field.status} ${field.value ?? ""} (${field.confidence})`);
}
