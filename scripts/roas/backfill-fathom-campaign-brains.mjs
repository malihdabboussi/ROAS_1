#!/usr/bin/env node
/**
 * Backfill historical Fathom meetings into client Campaign Brains (plan §11.3(5)).
 *
 * PR #316 dual-writes NEW meetings into the client's Campaign Brain at webhook
 * time; this script does the same for the ~245 historical meetings whose full
 * payloads (transcript included) are preserved in succeeded
 * `fathom_meeting_import` jobs. For each one it resolves the client campaign
 * from where the meeting already landed (`space_items` with a Fathom
 * recording/url reference → space → campaign), skips General/Personal system
 * campaigns, and inserts a `campaign_fathom_import` job with the exact dedupe
 * key `enqueueCampaignFathomImport` uses — so the existing retryable Brain
 * import runtime executes it and re-runs stay idempotent (any-status dedupe
 * checked here; the runtime's own active-dedupe guards races).
 *
 * Usage:
 *   node scripts/roas/backfill-fathom-campaign-brains.mjs             # dry-run: plan only
 *   node scripts/roas/backfill-fathom-campaign-brains.mjs --live      # insert queued jobs
 *   node scripts/roas/backfill-fathom-campaign-brains.mjs --live --limit 20
 *
 * Env: DATABASE_URL from scripts/roas/roas-secrets.env (prod project
 * lhfgtsjetcardinpgouq only; hard-checked). Override the env file path with
 * ROAS_SECRETS_ENV. Writes only `brain_import_jobs` rows in --live mode.
 */
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(here, '..', '..')
// `pg` ships with apps/api; ROAS_PG_FROM lets a worktree without node_modules
// borrow the main checkout's install.
const pgAnchor = process.env.ROAS_PG_FROM ?? join(repoRoot, 'apps', 'api', 'package.json')
const require = createRequire(pgAnchor)
const { Client } = require('pg')

const args = process.argv.slice(2)
const LIVE = args.includes('--live')
const limitIdx = args.indexOf('--limit')
const LIMIT = limitIdx >= 0 ? Number(args[limitIdx + 1]) : Infinity

const secretsPath = process.env.ROAS_SECRETS_ENV ?? join(repoRoot, 'scripts', 'roas', 'roas-secrets.env')
const envLine = readFileSync(secretsPath, 'utf8')
  .split('\n')
  .find((line) => line.startsWith('DATABASE_URL='))
const DATABASE_URL = (envLine ?? '').slice('DATABASE_URL='.length).trim().replace(/^["']|["']$/g, '')
if (!DATABASE_URL.includes('lhfgtsjetcardinpgouq')) {
  throw new Error('DATABASE_URL is not the ROAS prod project (lhfgtsjetcardinpgouq)')
}

const db = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } })
await db.connect()
await db.query(`SET statement_timeout = '120s'`)

/** Mirrors isSystemCampaign in fathom-campaign-brain-route.service.ts. */
function isSystemCampaign(campaign) {
  const config =
    campaign.config && typeof campaign.config === 'object' && !Array.isArray(campaign.config)
      ? campaign.config
      : {}
  const kind = typeof config.system_kind === 'string' ? config.system_kind.toLowerCase() : ''
  const name = (campaign.name ?? '').trim().toLowerCase()
  return (
    kind === 'general' ||
    kind === 'personal' ||
    config.is_general === true ||
    config.isSystemGeneral === true ||
    name === 'general'
  )
}

/** Every Fathom identifier a meeting payload can be recognized by. */
function meetingRecordingKeys(meeting) {
  const keys = new Set()
  const push = (value) => {
    const text = String(value ?? '').trim()
    if (!text) return
    keys.add(text)
    const call = text.match(/fathom\.video\/calls\/(\d+)/)?.[1]
    if (call) keys.add(call)
  }
  push(meeting.recording_id)
  push(meeting.id)
  push(meeting.call_id)
  push(meeting.url)
  push(meeting.share_url)
  push(meeting.meeting_url)
  return [...keys]
}

console.log(`Fathom → Campaign Brain backfill (${LIVE ? 'LIVE' : 'dry-run'})`)

const { rows: jobs } = await db.query(
  `select id, user_id, org_id, payload->'meeting' meeting
   from brain_import_jobs
   where job_type = 'fathom_meeting_import' and status = 'succeeded'
   order by created_at asc`,
)
console.log(`source meetings: ${jobs.length}`)

// Attribution: canonical meeting_recordings row → human/system-confirmed
// campaign link (meeting_context_links). Space routing is NOT used — the
// meetings one-room model lands every recording on the General space.
const { rows: links } = await db.query(
  `select mr.external_recording_id rid, mr.recording_url, mcl.entity_id campaign_id
   from meeting_recordings mr
   join meeting_context_links mcl
     on mcl.meeting_item_id = mr.meeting_item_id
    and mcl.entity_type = 'campaign'
    and mcl.confirmation_state = 'confirmed'`,
)
const campaignByKey = new Map()
for (const link of links) {
  const keys = [String(link.rid ?? '')]
  const call = String(link.recording_url ?? '').match(/fathom\.video\/calls\/(\d+)/)?.[1]
  if (call) keys.push(call)
  if (link.recording_url) keys.push(String(link.recording_url))
  for (const key of keys) {
    if (key && !campaignByKey.has(key)) campaignByKey.set(key, String(link.campaign_id))
  }
}
console.log(`confirmed campaign links: ${links.length}; distinct keys: ${campaignByKey.size}`)

const campaignIds = [...new Set(campaignByKey.values())]
const { rows: campaignRows } = await db.query(
  `select id, name, config from campaigns where id = any($1::uuid[])`,
  [campaignIds],
)
const campaigns = new Map(campaignRows.map((row) => [row.id, row]))

const { rows: existing } = await db.query(
  `select dedupe_key from brain_import_jobs where job_type = 'campaign_fathom_import'`,
)
const existingKeys = new Set(existing.map((row) => row.dedupe_key))

const plan = []
const skipped = { no_campaign: 0, system_campaign: 0, already_queued: 0, no_recording_key: 0 }
for (const job of jobs) {
  const meeting = job.meeting ?? {}
  const keys = meetingRecordingKeys(meeting)
  if (keys.length === 0) {
    skipped.no_recording_key += 1
    continue
  }
  const campaignId = keys.map((key) => campaignByKey.get(key)).find(Boolean)
  if (!campaignId) {
    skipped.no_campaign += 1
    continue
  }
  const campaign = campaigns.get(campaignId)
  if (!campaign || isSystemCampaign(campaign)) {
    skipped.system_campaign += 1
    continue
  }
  // Mirrors enqueueCampaignFathomImport's externalId + dedupe key exactly.
  const externalId = String(
    meeting.id || meeting.recording_id || meeting.call_id || meeting.url || meeting.title || job.id,
  )
  const dedupeKey = `campaign-fathom:${campaignId}:${externalId}`
  if (existingKeys.has(dedupeKey)) {
    skipped.already_queued += 1
    continue
  }
  existingKeys.add(dedupeKey)
  plan.push({
    sourceJobId: job.id,
    userId: job.user_id,
    orgId: job.org_id,
    campaignId,
    campaignName: campaign.name,
    dedupeKey,
    title: String(meeting.title || meeting.meeting_title || 'Campaign Fathom import'),
    meeting,
  })
}

const byCampaign = {}
for (const entry of plan) {
  byCampaign[entry.campaignName ?? entry.campaignId] = (byCampaign[entry.campaignName ?? entry.campaignId] ?? 0) + 1
}
console.log(`\nplan: ${plan.length} campaign imports · skipped:`, skipped)
console.table(
  Object.entries(byCampaign)
    .sort((left, right) => right[1] - left[1])
    .map(([campaign, meetings]) => ({ campaign, meetings })),
)

if (!LIVE) {
  console.log('\nDry run: nothing inserted. Re-run with --live to enqueue.')
  await db.end()
  process.exit(0)
}

let inserted = 0
for (const entry of plan.slice(0, LIMIT)) {
  await db.query(
    `insert into brain_import_jobs
       (user_id, org_id, job_type, title, dedupe_key, payload, status, attempts, max_attempts, next_attempt_at)
     values ($1, $2, 'campaign_fathom_import', $3, $4, $5, 'queued', 0, 3, now())
     on conflict do nothing`,
    [
      entry.userId,
      entry.orgId,
      entry.title.slice(0, 500),
      entry.dedupeKey,
      JSON.stringify({ campaignId: entry.campaignId, meeting: entry.meeting, backfill: true }),
    ],
  )
  inserted += 1
  if (inserted % 25 === 0) console.log(`inserted ${inserted}/${Math.min(plan.length, LIMIT)}`)
}
console.log(`\nInserted ${inserted} queued campaign_fathom_import jobs. The Brain import runtime will process them; re-running this script is a no-op.`)
await db.end()
