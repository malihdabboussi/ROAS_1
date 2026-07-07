#!/usr/bin/env node
/**
 * Upsert the generated Type 6 reference rows into `skill_library_resources`
 * via Supabase REST. Uses the service role key from `apps/agent-api/.env`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, '../..');
const ENV_PATH = path.join(ROOT, 'apps/agent-api/.env');
const PAYLOAD_PATH = path.join(__dirname, '.out/type6-resources.json');

function loadEnv(envPath) {
  const text = fs.readFileSync(envPath, 'utf8');
  const out = {};
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

async function main() {
  const env = loadEnv(ENV_PATH);
  const supabaseUrl = 'https://qfrvykscoymiwwgysvsr.supabase.co';
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY missing');

  const rows = JSON.parse(fs.readFileSync(PAYLOAD_PATH, 'utf8'));
  console.log(`Upserting ${rows.length} rows…`);

  const CHUNK = 10;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const batch = rows.slice(i, i + CHUNK).map((r) => ({
      skill_key: 'carousel-designer',
      file_path: r.file_path,
      content: r.content,
      content_type: r.content_type,
    }));
    const res = await fetch(
      `${supabaseUrl}/rest/v1/skill_library_resources?on_conflict=skill_key,file_path`,
      {
        method: 'POST',
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify(batch),
      },
    );
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Upsert failed (batch ${i}): ${res.status} ${txt}`);
    }
    console.log(`  upserted ${i + batch.length}/${rows.length}`);
  }
  console.log('done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
