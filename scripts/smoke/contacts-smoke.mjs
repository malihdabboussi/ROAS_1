#!/usr/bin/env node
/**
 * Contacts pipeline smoke test — production grade, runs against a LIVE stack.
 *
 * Verifies the standardized lead→contact pipeline end to end:
 *   identity (tenant-scoped identifiers, owner-scoped email uniqueness),
 *   funnel ingest, widget internal resolve, trigger retirement,
 *   cross-tenant isolation, and the activity rollup RPC.
 *
 * Required env:
 *   SUPABASE_URL                e.g. https://xxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY   service role (DB assertions, seeding, cleanup)
 *   INTERNAL_API_TOKEN          for POST /api/internal/contacts/resolve
 * Optional env:
 *   API_URL          apps/api base (default http://localhost:3001)
 *   SMOKE_USER_ID    acting user (default: owner of the newest funnel)
 *   SMOKE_ORG_ID     org scope   (default: org of that funnel; may be empty)
 *   SMOKE_FUNNEL_ID  funnel for ingest test (default: newest funnel)
 *   SMOKE_USER_TOKEN user JWT — enables authenticated API checks (T11)
 *   SMOKE_KEEP=1     skip cleanup (debugging)
 *
 * Run: node scripts/smoke/contacts-smoke.mjs
 * Exit code 0 = all PASS (SKIPs allowed), 1 = any FAIL.
 */

import { readFileSync } from 'node:fs'

loadDotEnvFallback()

const SUPABASE_URL = required('SUPABASE_URL')
const SERVICE_KEY = required('SUPABASE_SERVICE_ROLE_KEY')
const INTERNAL_TOKEN = required('INTERNAL_API_TOKEN')
const API_URL = (process.env.API_URL || 'http://localhost:3001').replace(/\/$/, '')
const USER_TOKEN = process.env.SMOKE_USER_TOKEN || null
const KEEP = process.env.SMOKE_KEEP === '1'

const RUN_ID = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
const SMOKE_DOMAIN = 'vibey-smoke.test'
const smokeEmail = (tag) => `smoke-${RUN_ID}-${tag}@${SMOKE_DOMAIN}`

const results = []
const created = { contacts: [], conversations: [], leads: [] }

function required(name) {
  const v = process.env[name]
  if (!v) {
    console.error(`Missing required env: ${name}`)
    process.exit(1)
  }
  return v
}

/** Fills missing required vars from apps/api/.env (simple KEY=VALUE lines only). */
function loadDotEnvFallback() {
  const needed = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'INTERNAL_API_TOKEN']
  if (needed.every((k) => process.env[k])) return
  try {
    const envPath = new URL('../../apps/api/.env', import.meta.url)
    const lines = readFileSync(envPath, 'utf8').split('\n')
    for (const line of lines) {
      const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim())
      if (!m) continue
      const [, key, raw] = m
      if (!needed.includes(key) || process.env[key]) continue
      process.env[key] = raw.replace(/^['"]|['"]$/g, '')
    }
  } catch {
    /* fall through to the required() error */
  }
}

// ─── PostgREST helpers (service role; no SDK dependency) ───

const pgHeaders = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
}

async function pgSelect(table, query) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, { headers: pgHeaders })
  if (!res.ok) throw new Error(`pgSelect ${table}: ${res.status} ${await res.text()}`)
  return res.json()
}

async function pgInsert(table, rows) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: { ...pgHeaders, Prefer: 'return=representation' },
    body: JSON.stringify(rows),
  })
  const body = await res.text()
  if (!res.ok) {
    const err = new Error(`pgInsert ${table}: ${res.status} ${body}`)
    err.status = res.status
    throw err
  }
  return JSON.parse(body)
}

async function pgDelete(table, query) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    method: 'DELETE',
    headers: pgHeaders,
  })
  if (!res.ok && res.status !== 404) {
    console.warn(`  cleanup warning: DELETE ${table}?${query} -> ${res.status}`)
  }
}

async function pgRpc(fn, args) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: pgHeaders,
    body: JSON.stringify(args),
  })
  const body = await res.text()
  if (!res.ok) throw new Error(`rpc ${fn}: ${res.status} ${body}`)
  return JSON.parse(body)
}

async function apiPost(path, body, headers = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
  let json = null
  try {
    json = await res.clone().json()
  } catch {
    /* non-JSON body */
  }
  return { status: res.status, json }
}

async function apiGet(path, headers = {}) {
  const res = await fetch(`${API_URL}${path}`, { headers })
  let json = null
  try {
    json = await res.clone().json()
  } catch {
    /* non-JSON body */
  }
  return { status: res.status, json }
}

// ─── Test harness ───

function record(name, status, note = '') {
  results.push({ name, status, note })
  const icon = status === 'PASS' ? '✅' : status === 'SKIP' ? '⏭️ ' : '❌'
  console.log(`${icon} ${status.padEnd(4)} ${name}${note ? ` — ${note}` : ''}`)
}

async function test(name, fn) {
  try {
    const note = await fn()
    record(name, 'PASS', typeof note === 'string' ? note : '')
  } catch (err) {
    if (err && err.skip) record(name, 'SKIP', err.message)
    else record(name, 'FAIL', err.message)
  }
}

function skip(message) {
  const err = new Error(message)
  err.skip = true
  return err
}

function assert(cond, message) {
  if (!cond) throw new Error(message)
}

// ─── Context discovery ───

async function discoverContext() {
  let funnelId = process.env.SMOKE_FUNNEL_ID || null
  let funnel = null
  if (funnelId) {
    const rows = await pgSelect('funnels', `id=eq.${funnelId}&select=id,user_id,org_id,campaign_id,name`)
    funnel = rows[0] ?? null
  } else {
    const rows = await pgSelect(
      'funnels',
      'select=id,user_id,org_id,campaign_id,name&order=updated_at.desc&limit=1',
    )
    funnel = rows[0] ?? null
    funnelId = funnel?.id ?? null
  }

  const userId = process.env.SMOKE_USER_ID || funnel?.user_id || null
  const orgId =
    process.env.SMOKE_ORG_ID !== undefined ? process.env.SMOKE_ORG_ID || null : (funnel?.org_id ?? null)

  let campaignId = funnel?.campaign_id ?? null
  if (!campaignId && userId) {
    const rows = await pgSelect(
      'campaigns',
      `user_id=eq.${userId}&select=id&order=updated_at.desc&limit=1`,
    )
    campaignId = rows[0]?.id ?? null
  }

  return { funnel, funnelId, userId, orgId, campaignId }
}

// ─── Main ───

async function main() {
  console.log(`\nContacts smoke test — run ${RUN_ID}`)
  console.log(`API: ${API_URL}`)
  console.log(`DB:  ${SUPABASE_URL}\n`)

  const ctx = await discoverContext()
  if (!ctx.userId) {
    console.error('No acting user found (set SMOKE_USER_ID). Aborting.')
    process.exit(1)
  }
  console.log(
    `Context: user=${ctx.userId} org=${ctx.orgId ?? '<personal>'} funnel=${ctx.funnelId ?? '<none>'} campaign=${ctx.campaignId ?? '<none>'}\n`,
  )
  const ownerKey = ctx.orgId ?? ctx.userId

  // Stale-run cleanup (idempotent re-runs)
  await cleanupSmokeData()

  // ── T1: Funnel ingest creates contact through the identifier service ──
  const funnelEmail = smokeEmail('funnel')
  await test('T1 funnel ingest -> contact + identifiers + memberships', async () => {
    if (!ctx.funnelId) throw skip('no funnel available (set SMOKE_FUNNEL_ID)')
    const res = await apiPost('/api/leads/ingest', {
      email: funnelEmail,
      funnelId: ctx.funnelId,
      name: 'Smoke Funnel',
      phone: '+1 555 010 0001',
    })
    assert(res.status === 200, `ingest returned ${res.status}: ${JSON.stringify(res.json)}`)

    const contacts = await pgSelect(
      'contacts',
      `email=eq.${funnelEmail}&select=id,org_id,user_id,contact_source,contact_source_detail,first_name`,
    )
    assert(contacts.length === 1, `expected 1 contact, found ${contacts.length}`)
    const contact = contacts[0]
    created.contacts.push(contact.id)
    assert(contact.contact_source === 'funnel', `contact_source=${contact.contact_source}`)

    const identifiers = await pgSelect(
      'contact_identifiers',
      `contact_id=eq.${contact.id}&select=kind,value,owner_key`,
    )
    const emailIdent = identifiers.find((i) => i.kind === 'email')
    assert(emailIdent, 'missing email identifier')
    assert(
      emailIdent.owner_key === (contact.org_id ?? contact.user_id),
      `identifier owner_key ${emailIdent.owner_key} != contact owner`,
    )
    assert(
      identifiers.some((i) => i.kind === 'phone'),
      'missing phone identifier',
    )

    const fm = await pgSelect(
      'contact_funnel_memberships',
      `contact_id=eq.${contact.id}&funnel_id=eq.${ctx.funnelId}&select=id`,
    )
    assert(fm.length === 1, 'missing funnel membership')
    return `contact ${contact.id}`
  })

  // ── T2: Repeat ingest is idempotent ──
  await test('T2 repeat funnel ingest -> no duplicates', async () => {
    if (!ctx.funnelId) throw skip('no funnel available')
    const res = await apiPost('/api/leads/ingest', {
      email: funnelEmail,
      funnelId: ctx.funnelId,
      name: 'Smoke Funnel',
    })
    assert(res.status === 200, `ingest returned ${res.status}`)
    const contacts = await pgSelect('contacts', `email=eq.${funnelEmail}&select=id`)
    assert(contacts.length === 1, `expected 1 contact, found ${contacts.length}`)
    const idents = await pgSelect(
      'contact_identifiers',
      `kind=eq.email&value=eq.${funnelEmail}&select=id`,
    )
    assert(idents.length === 1, `expected 1 email identifier, found ${idents.length}`)
  })

  // ── T3: sync_lead_to_contact trigger is retired ──
  await test('T3 raw lead insert does NOT create a contact (trigger retired)', async () => {
    if (!ctx.funnelId) throw skip('no funnel available')
    const trigEmail = smokeEmail('trigger')
    let lead
    try {
      ;[lead] = await pgInsert('leads', [
        { user_id: ctx.userId, funnel_id: ctx.funnelId, email: trigEmail, name: 'Smoke Trigger' },
      ])
    } catch (err) {
      throw skip(`raw lead insert rejected by schema (${err.status}); inconclusive`)
    }
    created.leads.push(lead.id)
    await new Promise((r) => setTimeout(r, 500))
    const contacts = await pgSelect('contacts', `email=eq.${trigEmail}&select=id`)
    assert(contacts.length === 0, 'a contact appeared from a raw lead insert — trigger still alive?')
  })

  // ── T4: Widget internal resolve ──
  const widgetEmail = smokeEmail('widget')
  let widgetContactId = null
  await test('T4 internal resolve (widget) -> contact + campaign membership', async () => {
    const res = await apiPost(
      '/api/internal/contacts/resolve',
      {
        user_id: ctx.userId,
        org_id: ctx.orgId,
        email: widgetEmail,
        first_name: 'Smoke',
        last_name: 'Widget',
        channel: 'widget',
        campaign_id: ctx.campaignId,
        agent_key: 'smoke-agent',
      },
      { Authorization: `Bearer ${INTERNAL_TOKEN}` },
    )
    assert(res.status === 200, `resolve returned ${res.status}: ${JSON.stringify(res.json)}`)
    widgetContactId = res.json?.contact_id
    assert(widgetContactId, 'no contact_id returned')
    created.contacts.push(widgetContactId)

    const [contact] = await pgSelect(
      'contacts',
      `id=eq.${widgetContactId}&select=contact_source,org_id,user_id`,
    )
    assert(contact?.contact_source === 'widget', `contact_source=${contact?.contact_source}`)

    if (ctx.campaignId) {
      const cm = await pgSelect(
        'contact_campaign_memberships',
        `contact_id=eq.${widgetContactId}&campaign_id=eq.${ctx.campaignId}&select=metadata`,
      )
      assert(cm.length === 1, 'missing campaign membership')
      assert(cm[0].metadata?.source === 'widget', 'membership metadata missing widget source')
    }
    return `contact ${widgetContactId}`
  })

  // ── T5: Internal resolve is idempotent ──
  await test('T5 internal resolve idempotent -> same contact id', async () => {
    const res = await apiPost(
      '/api/internal/contacts/resolve',
      { user_id: ctx.userId, org_id: ctx.orgId, email: widgetEmail, channel: 'widget' },
      { Authorization: `Bearer ${INTERNAL_TOKEN}` },
    )
    assert(res.status === 200, `resolve returned ${res.status}`)
    assert(res.json?.contact_id === widgetContactId, 'returned a different contact id')
  })

  // ── T6: Anonymous visitors never become contacts ──
  await test('T6 internal resolve without identifier -> null (anonymous stays anonymous)', async () => {
    const res = await apiPost(
      '/api/internal/contacts/resolve',
      { user_id: ctx.userId, org_id: ctx.orgId, channel: 'widget' },
      { Authorization: `Bearer ${INTERNAL_TOKEN}` },
    )
    assert(res.status === 200, `resolve returned ${res.status}`)
    assert(res.json?.contact_id === null, `expected null, got ${res.json?.contact_id}`)
  })

  // ── T7: Internal endpoint auth + validation ──
  await test('T7 internal resolve rejects bad token and bad channel', async () => {
    const bad = await apiPost(
      '/api/internal/contacts/resolve',
      { user_id: ctx.userId, email: widgetEmail, channel: 'widget' },
      { Authorization: 'Bearer wrong-token' },
    )
    assert([401, 403].includes(bad.status), `bad token returned ${bad.status}`)
    const badChannel = await apiPost(
      '/api/internal/contacts/resolve',
      { user_id: ctx.userId, email: widgetEmail, channel: 'CSV Import' },
      { Authorization: `Bearer ${INTERNAL_TOKEN}` },
    )
    assert(badChannel.status === 400, `bad channel returned ${badChannel.status}`)
  })

  // ── T8: Cross-tenant isolation (the Phase 1 corruption regression, live) ──
  await test('T8 same email in org + personal scope -> two isolated contacts', async () => {
    if (!ctx.orgId) throw skip('no org in context (set SMOKE_ORG_ID)')
    const isoEmail = smokeEmail('tenant')
    const orgRes = await apiPost(
      '/api/internal/contacts/resolve',
      { user_id: ctx.userId, org_id: ctx.orgId, email: isoEmail, channel: 'widget' },
      { Authorization: `Bearer ${INTERNAL_TOKEN}` },
    )
    const personalRes = await apiPost(
      '/api/internal/contacts/resolve',
      { user_id: ctx.userId, org_id: null, email: isoEmail, channel: 'widget' },
      { Authorization: `Bearer ${INTERNAL_TOKEN}` },
    )
    assert(orgRes.status === 200 && personalRes.status === 200, 'resolve failed')
    const orgContact = orgRes.json?.contact_id
    const personalContact = personalRes.json?.contact_id
    created.contacts.push(orgContact, personalContact)
    assert(orgContact && personalContact, 'missing contact ids')
    assert(orgContact !== personalContact, 'org and personal scopes shared one contact!')

    const idents = await pgSelect(
      'contact_identifiers',
      `kind=eq.email&value=eq.${isoEmail}&select=contact_id,owner_key`,
    )
    assert(idents.length === 2, `expected 2 identifiers, found ${idents.length}`)
    const orgIdent = idents.find((i) => i.owner_key === ctx.orgId)
    assert(orgIdent?.contact_id === orgContact, 'org identifier re-pointed — tenant corruption!')
  })

  // ── T9: Owner-scoped email uniqueness at the DB level ──
  await test('T9 duplicate (owner, email) insert rejected by DB', async () => {
    const dupEmail = smokeEmail('dup')
    const [first] = await pgInsert('contacts', [
      { user_id: ctx.userId, org_id: ctx.orgId, email: dupEmail, source: 'manual', contact_source: 'manual', tags: [] },
    ])
    created.contacts.push(first.id)
    let rejected = false
    try {
      const [second] = await pgInsert('contacts', [
        { user_id: ctx.userId, org_id: ctx.orgId, email: dupEmail, source: 'manual', contact_source: 'manual', tags: [] },
      ])
      created.contacts.push(second.id)
    } catch (err) {
      rejected = err.status === 409 || /duplicate|unique/i.test(err.message)
    }
    assert(rejected, 'duplicate (owner, email) contact insert was NOT rejected')
  })

  // ── T10: Activity rollup RPC ──
  await test('T10 conversation message rollup RPC', async () => {
    assert(widgetContactId, 'needs T4 contact')
    const [conv] = await pgInsert('conversations', [
      {
        user_id: ctx.userId,
        org_id: ctx.orgId,
        contact_id: widgetContactId,
        agent_id: 'smoke-agent',
        title: 'Smoke Telegram Chat',
        status: 'active',
        metadata: { source: 'telegram', telegram_chat_id: 'smoke-555' },
      },
    ])
    created.conversations.push(conv.id)
    await pgInsert('messages', [
      { conversation_id: conv.id, role: 'user', content: 'smoke msg 1', created_at: '2026-06-09T10:00:00Z' },
      { conversation_id: conv.id, role: 'assistant', content: 'smoke msg 2', created_at: '2026-06-09T10:01:00Z' },
      { conversation_id: conv.id, role: 'user', content: 'smoke msg 3', created_at: '2026-06-10T08:00:00Z' },
    ])
    const rollup = await pgRpc('get_contact_conversation_message_rollup', {
      p_contact_id: widgetContactId,
    })
    assert(Array.isArray(rollup) && rollup.length === 2, `expected 2 rollup days, got ${rollup?.length}`)
    const day1 = rollup.find((r) => r.day === '2026-06-09')
    assert(Number(day1?.message_count) === 2, `day1 count=${day1?.message_count}`)
    return `${rollup.length} day buckets`
  })

  // ── T11: Authenticated API surface (optional) ──
  await test('T11 authenticated API: conversations channel + activity events', async () => {
    if (!USER_TOKEN) throw skip('set SMOKE_USER_TOKEN to enable')
    assert(widgetContactId, 'needs T4 contact')
    const headers = { Authorization: `Bearer ${USER_TOKEN}`, ...(ctx.orgId ? { 'x-org-id': ctx.orgId } : {}) }

    const conv = await apiGet(`/api/leads/contacts/${widgetContactId}/conversations`, headers)
    assert(conv.status === 200, `conversations returned ${conv.status}`)
    const linked = conv.json?.conversations ?? []
    const smokeConv = linked.find((c) => c.title === 'Smoke Telegram Chat')
    assert(smokeConv, 'smoke conversation not in linked list')
    assert(smokeConv.channel === 'telegram', `channel=${smokeConv.channel}`)

    const act = await apiGet(`/api/leads/contacts/${widgetContactId}/activity`, headers)
    assert(act.status === 200, `activity returned ${act.status}`)
    const types = (act.json?.events ?? []).map((e) => e.event_type)
    assert(types.includes('conversation_started'), 'missing conversation_started event')
    assert(types.includes('conversation_message_activity'), 'missing message activity rollup event')
  })

  if (!KEEP) {
    console.log('\nCleaning up smoke data…')
    await cleanupSmokeData()
  } else {
    console.log('\nSMOKE_KEEP=1 — leaving smoke data in place.')
  }

  // ── Summary ──
  const fails = results.filter((r) => r.status === 'FAIL')
  const skips = results.filter((r) => r.status === 'SKIP')
  console.log(
    `\nResult: ${results.length - fails.length - skips.length} passed, ${fails.length} failed, ${skips.length} skipped`,
  )
  process.exit(fails.length > 0 ? 1 : 0)
}

async function cleanupSmokeData() {
  // Find every contact whose email belongs to the smoke domain (any run).
  const contacts = await pgSelect('contacts', `email=like.*@${SMOKE_DOMAIN}&select=id`)
  const ids = [...new Set([...contacts.map((c) => c.id), ...created.contacts.filter(Boolean)])]
  if (ids.length > 0) {
    const inList = `in.(${ids.join(',')})`
    const convs = await pgSelect('conversations', `contact_id=${inList}&select=id`)
    const convIds = [...new Set([...convs.map((c) => c.id), ...created.conversations])]
    if (convIds.length > 0) {
      await pgDelete('messages', `conversation_id=in.(${convIds.join(',')})`)
      await pgDelete('conversations', `id=in.(${convIds.join(',')})`)
    }
    await pgDelete('contact_campaign_memberships', `contact_id=${inList}`)
    await pgDelete('contact_funnel_memberships', `contact_id=${inList}`)
    await pgDelete('contact_identifiers', `contact_id=${inList}`)
    await pgDelete('contact_activity', `contact_id=${inList}`)
    await pgDelete('contact_notes', `contact_id=${inList}`)
    await pgDelete('contacts', `id=${inList}`)
  }
  await pgDelete('leads', `email=like.*@${SMOKE_DOMAIN}`)
}

main().catch((err) => {
  console.error('\nSmoke test crashed:', err)
  process.exit(1)
})
