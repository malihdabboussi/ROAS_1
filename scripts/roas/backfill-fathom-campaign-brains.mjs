#!/usr/bin/env node
/**
 * Backfill campaign_fathom_import jobs from succeeded user-brain
 * fathom_meeting_import rows, attributing each meeting to client campaigns
 * via invitee-email / client-name matching + Page Grader client_scope_map.
 *
 * Usage:
 *   node scripts/roas/backfill-fathom-campaign-brains.mjs            # dry-run
 *   node scripts/roas/backfill-fathom-campaign-brains.mjs --live      # insert jobs
 *   node scripts/roas/backfill-fathom-campaign-brains.mjs --limit 20
 *
 * Env: scripts/roas/roas-secrets.env → DATABASE_URL must contain
 * lhfgtsjetcardinpgouq (ROAS prod). Migration-free.
 */
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(here, '..', '..')
const require = createRequire(join(repoRoot, 'apps', 'api', 'package.json'))
const { Client } = require('pg')

const args = process.argv.slice(2)
const LIVE = args.includes('--live')
const limitIdx = args.indexOf('--limit')
const LIMIT = limitIdx >= 0 && args[limitIdx + 1] ? Number(args[limitIdx + 1]) : null

const secretsPath =
  process.env.ROAS_SECRETS_ENV ?? join(repoRoot, 'scripts', 'roas', 'roas-secrets.env')
const env = Object.fromEntries(
  readFileSync(secretsPath, 'utf8')
    .split('\n')
    .filter((line) => line.includes('=') && !line.trim().startsWith('#'))
    .map((line) => {
      const [key, ...rest] = line.split('=')
      return [key.trim(), rest.join('=').trim().replace(/^["']|["']$/g, '')]
    }),
)
const DATABASE_URL = env.DATABASE_URL ?? ''
if (!DATABASE_URL.includes('lhfgtsjetcardinpgouq')) {
  throw new Error('DATABASE_URL is not the ROAS prod project (lhfgtsjetcardinpgouq)')
}

const INTERNAL_EMAIL_DOMAINS = new Set([
  'roas.co',
  'roas.io',
  'dylanvanas.com',
  'gmail.com',
  'googlemail.com',
  'outlook.com',
  'hotmail.com',
  'yahoo.com',
  'icloud.com',
])

function normalizeText(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function campaignFathomExternalId(meeting) {
  return String(
    meeting.id || meeting.recording_id || meeting.call_id || meeting.url || meeting.title || '',
  )
}

function campaignFathomDedupeKey(campaignId, meeting) {
  return `campaign-fathom:${campaignId}:${campaignFathomExternalId(meeting)}`
}

function inviteeEmails(meeting) {
  const list = Array.isArray(meeting.calendar_invitees) ? meeting.calendar_invitees : []
  const emails = []
  for (const entry of list) {
    const email =
      typeof entry === 'string'
        ? entry
        : entry && typeof entry === 'object'
          ? String(entry.email ?? '')
          : ''
    const normalized = email.trim().toLowerCase()
    if (normalized.includes('@')) emails.push(normalized)
  }
  return [...new Set(emails)]
}

function inviteeDomains(emails) {
  return [
    ...new Set(
      emails
        .map((email) => email.split('@')[1] ?? '')
        .filter((domain) => domain && !INTERNAL_EMAIL_DOMAINS.has(domain)),
    ),
  ]
}

function isSystemCampaign(row) {
  const config =
    row.config && typeof row.config === 'object' && !Array.isArray(row.config) ? row.config : {}
  const kind = typeof config.system_kind === 'string' ? config.system_kind.toLowerCase() : ''
  const name = String(row.name ?? '')
    .trim()
    .toLowerCase()
  return (
    kind === 'general' ||
    kind === 'personal' ||
    config.is_general === true ||
    config.isSystemGeneral === true ||
    name === 'general'
  )
}

function matchClientIds({ meeting, scopeEntries }) {
  const emails = inviteeEmails(meeting)
  const domains = inviteeDomains(emails)
  const titleHaystack = normalizeText(
    [meeting.title, meeting.meeting_title, meeting.summary].filter(Boolean).join(' '),
  )
  const matched = []
  for (const entry of scopeEntries) {
    const campaignName = normalizeText(entry.campaign_name || entry.campaignName || '')
    const nameTokens = campaignName.split(' ').filter((token) => token.length >= 4)
    const domainHit = domains.some((domain) => {
      const domainText = normalizeText(domain.replace(/\./g, ' '))
      return nameTokens.some((token) => domainText.includes(token) || domain.includes(token))
    })
    const titleHit = campaignName.length >= 4 && titleHaystack.includes(campaignName)
    if (domainHit || titleHit) matched.push(entry)
  }
  return matched
}

const db = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } })
await db.connect()

const jobsSql = `
  select id, user_id, org_id, title, payload, created_at
  from brain_import_jobs
  where job_type = 'fathom_meeting_import'
    and status = 'succeeded'
  order by created_at asc
  ${LIMIT ? `limit ${Number(LIMIT)}` : ''}
`
const { rows: jobs } = await db.query(jobsSql)
console.log(`Loaded ${jobs.length} succeeded fathom_meeting_import job(s)${LIVE ? '' : ' (dry-run)'}`)

const scopeByUser = new Map()
async function loadScopeEntries(userId) {
  if (scopeByUser.has(userId)) return scopeByUser.get(userId)
  const { rows } = await db.query(
    `select metadata->'client_scope_map' as client_scope_map
     from user_integrations
     where user_id = $1::uuid
       and integration_id = 'page_grader'
       and status = 'connected'
     order by updated_at desc nulls last
     limit 1`,
    [userId],
  )
  const raw = rows[0]?.client_scope_map
  const map = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}
  const entries = Object.entries(map)
    .map(([clientId, value]) => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return null
      const campaignId = typeof value.campaign_id === 'string' ? value.campaign_id.trim() : ''
      if (!campaignId) return null
      return {
        client_id: clientId,
        campaign_id: campaignId,
        campaign_name: typeof value.campaign_name === 'string' ? value.campaign_name : '',
      }
    })
    .filter(Boolean)
  scopeByUser.set(userId, entries)
  return entries
}

const campaignCache = new Map()
async function loadCampaign(campaignId) {
  if (campaignCache.has(campaignId)) return campaignCache.get(campaignId)
  const { rows } = await db.query(`select id, name, config from campaigns where id = $1::uuid`, [
    campaignId,
  ])
  const row = rows[0] ?? null
  campaignCache.set(campaignId, row)
  return row
}

const plan = []
for (const job of jobs) {
  const meeting =
    job.payload?.meeting && typeof job.payload.meeting === 'object' ? job.payload.meeting : null
  if (!meeting) continue
  const scopeEntries = await loadScopeEntries(job.user_id)
  if (scopeEntries.length === 0) continue
  const matched = matchClientIds({ meeting, scopeEntries })
  for (const entry of matched) {
    const campaign = await loadCampaign(entry.campaign_id)
    if (!campaign || isSystemCampaign(campaign)) continue
    const dedupeKey = campaignFathomDedupeKey(entry.campaign_id, meeting)
    plan.push({
      sourceJobId: job.id,
      userId: job.user_id,
      orgId: job.org_id ?? null,
      clientId: entry.client_id,
      campaignId: entry.campaign_id,
      campaignName: campaign.name,
      dedupeKey,
      title: String(meeting.title || meeting.meeting_title || job.title || 'Campaign Fathom import'),
      meeting,
    })
  }
}

const uniquePlan = []
const seen = new Set()
for (const row of plan) {
  const key = `${row.userId}:${row.dedupeKey}`
  if (seen.has(key)) continue
  seen.add(key)
  uniquePlan.push(row)
}

const dedupeKeys = uniquePlan.map((row) => row.dedupeKey)
const existing = new Set()
if (dedupeKeys.length > 0) {
  const { rows } = await db.query(
    `select dedupe_key from brain_import_jobs where dedupe_key = any($1::text[])`,
    [dedupeKeys],
  )
  for (const row of rows) existing.add(row.dedupe_key)
}

const toInsert = uniquePlan.filter((row) => !existing.has(row.dedupeKey))
console.log(
  JSON.stringify(
    {
      scannedJobs: jobs.length,
      matchedPlan: uniquePlan.length,
      alreadyPresent: uniquePlan.length - toInsert.length,
      wouldInsert: toInsert.length,
      sample: toInsert.slice(0, 10).map((row) => ({
        campaignId: row.campaignId,
        campaignName: row.campaignName,
        clientId: row.clientId,
        dedupeKey: row.dedupeKey,
        title: row.title,
      })),
    },
    null,
    2,
  ),
)

if (!LIVE) {
  console.log('Dry-run only. Re-run with --live to insert campaign_fathom_import jobs.')
  await db.end()
  process.exit(0)
}

let inserted = 0
for (const row of toInsert) {
  const result = await db.query(
    `insert into brain_import_jobs (
       user_id, org_id, job_type, title, dedupe_key, payload, status, attempts, max_attempts, next_attempt_at
     ) values (
       $1::uuid, $2::uuid, 'campaign_fathom_import', $3, $4, $5::jsonb, 'queued', 0, 3, now()
     )
     returning id`,
    [
      row.userId,
      row.orgId,
      row.title.slice(0, 500),
      row.dedupeKey,
      JSON.stringify({ campaignId: row.campaignId, meeting: row.meeting }),
    ],
  )
  if (result.rowCount > 0) inserted += 1
}

console.log(`Inserted ${inserted} campaign_fathom_import job(s).`)
await db.end()
