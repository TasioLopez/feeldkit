/**
 * Roll back the active flow_pack_versions row for a flow key.
 *
 * Usage:
 *   npm run flows:rollback -- <flow_key> --to <semver>
 */
import { createClient } from "@supabase/supabase-js";
import { rollbackFlowToVersion } from "../src/lib/flows/lifecycle";

async function main() {
  const args = process.argv.slice(2);
  const flowKey = args[0];
  const toIdx = args.indexOf("--to");
  const targetVersion = toIdx >= 0 ? args[toIdx + 1] : "";
  if (!flowKey || !targetVersion) {
    console.error("Usage: npm run flows:rollback -- <flow_key> --to <semver>");
    process.exit(1);
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }
  const admin = createClient(url, key, { auth: { persistSession: false } });
  const result = await rollbackFlowToVersion(admin, {
    flowKey,
    targetVersion,
    organizationId: null,
    actorId: null,
  });
  if (!result.ok) {
    console.error(`[FAIL] ${result.error}`);
    process.exit(1);
  }
  console.log(`[OK] Rolled ${flowKey} active version -> ${targetVersion}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
