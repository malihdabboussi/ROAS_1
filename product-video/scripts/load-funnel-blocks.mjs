#!/usr/bin/env node
/**
 * Loads draft funnel blocks from product-video/scripts/.out/funnel-blocks.json
 * into public.funnel_blocks via Supabase PostgREST using the service role key.
 *
 * Reads SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from apps/api/.env
 *
 * Usage: node product-video/scripts/load-funnel-blocks.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../..');
const JSON_PATH = path.join(__dirname, '.out', 'funnel-blocks.json');
const ENV_PATH = path.join(ROOT, 'apps/api/.env');

function loadEnv() {
  const text = fs.readFileSync(ENV_PATH, 'utf8');
  const env = {};
  for (const line of text.split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return env;
}

async function postBatch(url, key, rows) {
  const res = await fetch(`${url}/rest/v1/funnel_blocks?on_conflict=slug`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POST failed (${res.status}): ${text.slice(0, 800)}`);
  }
}

async function main() {
  const env = loadEnv();
  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in apps/api/.env');

  const rows = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
  const payload = rows.map((row) => ({
    slug: row.slug,
    name: row.name,
    description: row.description,
    category: row.category,
    page_types: row.page_types,
    funnel_types: row.funnel_types,
    slot_schema: row.slot_schema,
    theme_tokens: row.theme_tokens,
    asset_slots: row.asset_slots,
    tsx_template: row.tsx_template,
    default_props: row.default_props,
    layout_signature: row.layout_signature,
    source_type: row.source_type,
    source_reference: row.source_reference,
    is_system: true,
    quality_status: 'draft',
    is_published: false,
  }));

  console.log(`loading ${payload.length} blocks...`);
  const BATCH = 10;
  for (let i = 0; i < payload.length; i += BATCH) {
    const slice = payload.slice(i, i + BATCH);
    await postBatch(url, key, slice);
    console.log(`  + ${i + slice.length}/${payload.length}`);
  }
  console.log('done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
