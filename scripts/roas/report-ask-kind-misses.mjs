#!/usr/bin/env node
/**
 * Weekly ask-kind miss report (plan §11.0/§11.7 feedback loop).
 *
 * Reads `slack_pixel_turns` (read-only) and surfaces the turns where the N0
 * classifier and reality disagree — the raw material for new CLIENT/TEAM
 * patterns in `slack-ask-kind.ts`:
 *   1. kind='unclear' but a client was resolved (stamp/quote/named)  → missed client signal
 *   2. kind='client'  but no client was resolved                     → over-firing signal
 *   3. any turn with forbidden_ask=true                              → hard failure
 *
 * Usage: node scripts/roas/report-ask-kind-misses.mjs [--days 7]
 * Env: DATABASE_URL from scripts/roas/roas-secrets.env (prod
 * lhfgtsjetcardinpgouq only; hard-checked). ROAS_SECRETS_ENV / ROAS_PG_FROM
 * override the env file / `pg` resolution for worktrees.
 */
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(here, '..', '..')
const require = createRequire(process.env.ROAS_PG_FROM ?? join(repoRoot, 'apps', 'api', 'package.json'))
const { Client } = require('pg')

const daysIdx = process.argv.indexOf('--days')
const DAYS = daysIdx >= 0 ? Number(process.argv[daysIdx + 1]) : 7

const secretsPath = process.env.ROAS_SECRETS_ENV ?? join(repoRoot, 'scripts', 'roas', 'roas-secrets.env')
const line = readFileSync(secretsPath, 'utf8').split('\n').find((l) => l.startsWith('DATABASE_URL='))
const DATABASE_URL = (line ?? '').slice('DATABASE_URL='.length).trim().replace(/^["']|["']$/g, '')
if (!DATABASE_URL.includes('lhfgtsjetcardinpgouq')) throw new Error('DATABASE_URL is not the ROAS prod project')

const db = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } })
await db.connect()
await db.query('SET default_transaction_read_only = on')

const { rows: summary } = await db.query(
  `select ask_kind, client_source, count(*) n, count(*) filter (where forbidden_ask) forbidden
   from slack_pixel_turns where created_at > now() - ($1 || ' days')::interval
   group by 1, 2 order by 3 desc`,
  [DAYS],
)
console.log(`\n== slack_pixel_turns, last ${DAYS} days ==`)
console.table(summary)

const { rows: missedClient } = await db.query(
  `select created_at::date d, channel_id, left(coalesce(client_id,''), 8) client, kind_signals,
          (select string_agg(tc->>'name', ',') from jsonb_array_elements(tool_calls) tc) tools
   from slack_pixel_turns
   where created_at > now() - ($1 || ' days')::interval
     and ask_kind = 'unclear' and client_source in ('stamp','quote','hint','named')
   order by created_at desc limit 30`,
  [DAYS],
)
console.log(`\n== MISSED CLIENT SIGNALS (unclear + client resolved) — add patterns for these (${missedClient.length}) ==`)
console.table(missedClient)

const { rows: overfired } = await db.query(
  `select created_at::date d, channel_id, kind_signals
   from slack_pixel_turns
   where created_at > now() - ($1 || ' days')::interval
     and ask_kind = 'client' and coalesce(client_source, 'none') = 'none'
   order by created_at desc limit 15`,
  [DAYS],
)
console.log(`\n== CLIENT KIND, NO CLIENT RESOLVED (check for over-firing) (${overfired.length}) ==`)
console.table(overfired)

const { rows: forbidden } = await db.query(
  `select created_at, channel_id, ask_kind, client_source
   from slack_pixel_turns
   where created_at > now() - ($1 || ' days')::interval and forbidden_ask
   order by created_at desc limit 15`,
  [DAYS],
)
console.log(`\n== FORBIDDEN ASKS (Pixel asked "which client/channel") (${forbidden.length}) ==`)
console.table(forbidden)
console.log(
  '\nNext step: for each missed-client row, pull the message from slack_observation_events by channel_id + timestamp and add a pattern to apps/api/src/modules/slack/services/slack-ask-kind.ts (test in __tests__/slack-ask-kind.test.ts).',
)
await db.end()
