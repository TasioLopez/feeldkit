import { FeeldKitClient } from "@feeldkit/sdk";

const client = new FeeldKitClient({
  apiKey: process.env.FEELDKIT_API_KEY!,
  baseUrl: process.env.FEELDKIT_BASE_URL ?? "http://localhost:3000",
});

const queue = await client.admin.promotions.list({
  status: ["pending_global"],
  limit: 25,
});

for (const proposal of queue.rows) {
  console.log(`${proposal.id} ${proposal.target_table} ${proposal.status}`);
}
