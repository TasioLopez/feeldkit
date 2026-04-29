import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

async function run() {
  const packKey = process.argv[2];
  const nextVersion = process.argv[3];
  if (!packKey || !nextVersion) {
    console.error("Usage: npm run update:pack -- <pack-key> <version>");
    process.exit(1);
  }

  const registryPath = resolve(process.cwd(), ".generated", "imports-registry.json");
  const previous = await readFile(registryPath, "utf8").catch(() => "[]");
  const registry = JSON.parse(previous) as Array<Record<string, unknown>>;
  const updated = registry.map((entry) =>
    entry.pack_key === packKey
      ? {
          ...entry,
          version: nextVersion,
          updated_at: new Date().toISOString(),
        }
      : entry,
  );
  await writeFile(registryPath, JSON.stringify(updated, null, 2));
  console.log(`Updated local registry pack ${packKey} -> ${nextVersion}`);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.log("Skipped DB update (missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY).");
    return;
  }
  const admin = createClient(url, key);
  const { data: pack, error } = await admin.from("field_packs").select("id,key,version").eq("key", packKey).maybeSingle();
  if (error || !pack?.id) {
    console.error(`Failed to locate pack '${packKey}' in DB`, error?.message ?? "");
    process.exit(1);
  }
  await admin.from("field_packs").update({ version: nextVersion }).eq("id", pack.id);
  await admin.from("field_pack_versions").insert({
    field_pack_id: pack.id,
    version: nextVersion,
    changelog: `Manual version bump from ${pack.version ?? "unknown"} to ${nextVersion}`,
    source_snapshot: { reason: "manual-update-pack-script", updated_at: new Date().toISOString() },
    created_by: null,
  });
  console.log(`Updated DB pack ${packKey} -> ${nextVersion}`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
