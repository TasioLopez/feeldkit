import { writeFile } from "node:fs/promises";
import { FeeldKitClient } from "@feeldkit/sdk";

const staging = new FeeldKitClient({
  apiKey: process.env.FEELDKIT_STAGING_API_KEY!,
  baseUrl: process.env.FEELDKIT_STAGING_BASE_URL ?? "http://localhost:3000",
});

const prod = new FeeldKitClient({
  apiKey: process.env.FEELDKIT_PROD_API_KEY!,
  baseUrl: process.env.FEELDKIT_PROD_BASE_URL ?? "http://localhost:3000",
});

const { profile } = await staging.admin.profiles.export();
await writeFile("org-config-profile.json", `${JSON.stringify(profile, null, 2)}\n`, "utf8");

const dryRun = await prod.admin.profiles.importDryRun(profile);
console.log(JSON.stringify(dryRun, null, 2));
if (!dryRun.ok) process.exit(1);
