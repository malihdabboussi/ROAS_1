#!/usr/bin/env node
/**
 * Pixel Slack harness (plan §11.7) — posts the R-catalog fixtures into the
 * harness channel (`2`), waits for Pixel's threaded reply, and scores each turn
 * from `slack_pixel_turns` telemetry (§11.0) + the reply text.
 *
 * Usage:
 *   node scripts/roas/pixel-slack-harness/run.mjs            # dry-run: print plan, post nothing
 *   node scripts/roas/pixel-slack-harness/run.mjs --live     # post fixtures and score
 *   node scripts/roas/pixel-slack-harness/run.mjs --live --only R01,R31 --wait 240
 *
 * Env (from scripts/roas/roas-secrets.env): DATABASE_URL (prod, project
 * lhfgtsjetcardinpgouq only), SLACK_HARNESS_USER_TOKEN (xoxp — posts as the
 * operator so Pixel treats it as an Internal sender; the bot token cannot ask
 * itself). Output: .docs/reports/pixel-slack-harness-<date>.json + a table.
 */
import { createRequire } from 'node:module'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(here, '..', '..', '..')
const require = createRequire(join(repoRoot, 'apps', 'api', 'package.json'))
const { Client } = require('pg')

const args = process.argv.slice(2)
const flag = (name) => args.includes(`--${name}`)
const opt = (name, fallback) => {
  const idx = args.indexOf(`--${name}`)
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : fallback
}
const LIVE = flag('live')
const ONLY = opt('only', '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean)
const WAIT_SECONDS = Number(opt('wait', '180'))

const secretsPath = process.env.ROAS_SECRETS_ENV ?? join(repoRoot, 'scripts', 'roas', 'roas-secrets.env')
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
if (!DATABASE_URL.includes('lhfgtsjetcardinpgouq')) throw new Error('DATABASE_URL is not the ROAS prod project')
const SLACK_TOKEN = env.SLACK_HARNESS_USER_TOKEN ?? ''

const fixturesFile = JSON.parse(readFileSync(join(here, 'fixtures.json'), 'utf8'))
const fixtures = fixturesFile.fixtures.filter((f) => ONLY.length === 0 || ONLY.includes(f.id))

const db = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } })
await db.connect()
await db.query('SET default_transaction_read_only = on')

async function slack(method, body) {
  const res = await fetch(`https://slack.com/api/${method}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${SLACK_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (!json.ok) throw new Error(`${method}: ${json.error}`)
  return json
}

async function findHarnessChannel(name) {
  const { rows } = await db.query(
    `select channel_id, channel_name, org_id, slack_team_id from slack_observation_channels where channel_name = $1 order by updated_at desc limit 1`,
    [name],
  )
  if (!rows[0]) throw new Error(`Harness channel "${name}" is not in slack_observation_channels`)
  return rows[0]
}

async function findBotUserId(teamId) {
  const { rows } = await db.query(
    `select metadata->>'bot_user_id' bot from user_integrations where integration_id='slack' and status='connected' and metadata->>'team_id' = $1 and org_id is not null limit 1`,
    [teamId],
  )
  return rows[0]?.bot ?? null
}

async function waitForTurn({ channelId, messageTs, seconds }) {
  const deadline = Date.now() + seconds * 1000
  while (Date.now() < deadline) {
    const { rows } = await db.query(
      `select ask_kind, kind_signals, client_source, client_id, tool_calls, tool_count, duration_ms, outcome, forbidden_ask, reply_chars from slack_pixel_turns where channel_id = $1 and (message_ts = $2 or thread_ts = $2) order by created_at desc limit 1`,
      [channelId, messageTs],
    )
    if (rows[0]) return rows[0]
    await new Promise((resolve) => setTimeout(resolve, 5000))
  }
  return null
}

async function readReply({ channelId, threadTs, botUserId }) {
  const json = await slack('conversations.replies', { channel: channelId, ts: threadTs, limit: 20 })
  const reply = (json.messages ?? []).find((m) => m.ts !== threadTs && (m.user === botUserId || m.bot_id))
  return reply?.text ?? ''
}

function score(fixture, turn, replyText) {
  const checks = []
  const add = (name, ok, detail = '') => checks.push({ name, ok, detail })
  const tools = Array.isArray(turn?.tool_calls) ? turn.tool_calls.map((t) => String(t.name ?? t)) : []
  add('turn_recorded', Boolean(turn), turn ? turn.outcome : 'no slack_pixel_turns row')
  if (turn) {
    add('ask_kind', turn.ask_kind === fixture.expect.kind, `${turn.ask_kind} (want ${fixture.expect.kind})`)
    add('no_forbidden_ask', turn.forbidden_ask === false, turn.forbidden_ask ? 'asked which client/channel' : '')
    for (const tool of fixture.expect.tools ?? []) {
      add(`tool:${tool}`, tools.some((t) => t.toLowerCase().includes(tool.toLowerCase())), tools.join(',') || 'no tools')
    }
    for (const tool of fixture.expect.must_not_call ?? []) {
      add(`no_tool:${tool}`, !tools.some((t) => t.toLowerCase().includes(tool.toLowerCase())))
    }
  }
  for (const needle of fixture.expect.must_mention ?? []) {
    add(`mentions:${needle}`, replyText.toLowerCase().includes(needle.toLowerCase()))
  }
  if (fixture.expect.must_ask_one_question) {
    add('asks_one_question', (replyText.match(/\?/g) ?? []).length === 1, replyText.slice(0, 80))
  }
  const passed = checks.filter((c) => c.ok).length
  return { checks, passed, total: checks.length }
}

const channel = await findHarnessChannel(fixturesFile.channel_name)
const botUserId = await findBotUserId(channel.slack_team_id)
console.log(`Harness channel #${channel.channel_name} (${channel.channel_id}) team=${channel.slack_team_id} bot=${botUserId} live=${LIVE} fixtures=${fixtures.length}`)

if (!LIVE) {
  console.table(fixtures.map((f) => ({ id: f.id, kind: f.expect.kind, tools: (f.expect.tools ?? []).join(','), text: f.text.slice(0, 70) })))
  console.log('Dry run: nothing posted. Re-run with --live to post + score.')
  await db.end()
  process.exit(0)
}
if (!SLACK_TOKEN) throw new Error('SLACK_HARNESS_USER_TOKEN missing (xoxp token of the operator)')

const results = []
for (const fixture of fixtures) {
  const posted = await slack('chat.postMessage', {
    channel: channel.channel_id,
    text: `<@${botUserId}> ${fixture.text}`,
  })
  const turn = await waitForTurn({ channelId: channel.channel_id, messageTs: posted.ts, seconds: WAIT_SECONDS })
  const replyText = await readReply({ channelId: channel.channel_id, threadTs: posted.ts, botUserId }).catch(() => '')
  const scored = score(fixture, turn, replyText)
  results.push({ id: fixture.id, text: fixture.text, message_ts: posted.ts, turn, reply: replyText.slice(0, 600), ...scored })
  console.log(`${fixture.id} ${scored.passed}/${scored.total} ${scored.checks.filter((c) => !c.ok).map((c) => `✗${c.name}`).join(' ')}`)
  await new Promise((resolve) => setTimeout(resolve, 15_000)) // don't stack turns
}

const stamp = new Date().toISOString().slice(0, 10)
mkdirSync(join(repoRoot, '.docs', 'reports'), { recursive: true })
const out = join(repoRoot, '.docs', 'reports', `pixel-slack-harness-${stamp}.json`)
writeFileSync(out, JSON.stringify({ ran_at: new Date().toISOString(), channel, results }, null, 2))
const passed = results.reduce((n, r) => n + r.passed, 0)
const total = results.reduce((n, r) => n + r.total, 0)
console.log(`\nScore ${passed}/${total} checks · report ${out}`)
await db.end()
