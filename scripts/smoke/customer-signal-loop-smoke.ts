/**
 * Customer Signal Loop smoke test — production-like, end-to-end, against the YC Demo account.
 *
 * Outcomes verified (see .docs/plans/customer-signal-loop.md):
 *   T1 (O1)  telegram conversation → ns_memories row (source_type=telegram_chat, contact_id set)
 *   T2 (O2)  widget conversation with email → widget_chat memory; anonymous widget → nothing
 *   T3 (O3)  fathom webhook → fathom_call memory through the same envelope pipeline
 *   T6 (O6)  second sweep cycle creates no duplicates
 *
 * Preconditions:
 *   - `pnpm seed:yc-demo` has been run (org "Foundry Creative", user yc-demo@vibey.im,
 *     customer brain with cortex_max=true)
 *   - apps/api running (default http://localhost:3001)
 *   - mission-worker running with:
 *       CUSTOMER_SIGNAL_SWEEP_MS=10000 CUSTOMER_SIGNAL_FLUSH_TOKENS=500 CUSTOMER_SIGNAL_GRACE_MINUTES=0
 *
 * Usage:
 *   pnpm smoke:customer-signal [--keep]
 */
import { randomUUID } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const repoRoot = resolve(__dirname, '../..')
for (const envFile of [resolve(repoRoot, 'apps/api/.env')]) {
  if (existsSync(envFile)) loadEnvFile(envFile)
}

const supabaseUrl = process.env.SUPABASE_URL ?? ''
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
const platformApiUrl = trimTrailingSlash(
  process.env.VIBEY_SMOKE_PLATFORM_API_URL ?? 'http://localhost:3001',
)
const pollMs = Number(process.env.VIBEY_SMOKE_POLL_MS ?? '3000')
const timeoutMs = Number(process.env.VIBEY_SMOKE_TIMEOUT_MS ?? '300000')
const keep = process.argv.includes('--keep')

const DEMO_EMAIL = 'yc-demo@vibey.im'
const runId = randomUUID().slice(0, 8)
const runStartedAt = new Date().toISOString()

type Check = { name: string; ok: boolean; detail?: string }
const checks: Check[] = []
const cleanup: Array<() => Promise<void>> = []

async function main(): Promise<void> {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required (apps/api/.env)')
  }
  const admin = createClient(supabaseUrl, serviceRoleKey)

  console.log(`run=${runId} platform=${platformApiUrl}`)

  const demo = await resolveDemoAccount(admin)
  console.log(`demo user=${demo.userId} org=${demo.orgId} brain=${demo.brainId}`)
  console.log('')

  // ── Seed channel data ────────────────────────────────────────────────────
  const telegram = await seedTelegramConversation(admin, demo)
  const widget = await seedWidgetConversation(admin, demo)
  const anonWidget = await seedAnonymousWidgetConversation(admin, demo)
  const fathomMeetingId = await postFathomWebhook(admin, demo)

  // ── T1 + T2 + T3: poll for routed memories ───────────────────────────────
  await pollUntil('T1 telegram outbox done', () =>
    outboxDone(admin, `interaction-${demo.brainId}-${telegram.conversationId}-`),
  )
  await pollUntil('T2 widget outbox done', () =>
    outboxDone(admin, `interaction-${demo.brainId}-${widget.conversationId}-`),
  )
  await pollUntil('T3 fathom outbox done', () =>
    outboxDone(admin, `interaction-${demo.brainId}-${fathomMeetingId}-`),
  )

  const telegramMemories = await countMemories(admin, demo.brainId, 'telegram_chat')
  record(
    'T1 telegram memory created',
    telegramMemories.count >= 1,
    `count=${telegramMemories.count}`,
  )
  record(
    'T1 telegram memory has contact_id',
    telegramMemories.withContact >= 1,
    `with_contact=${telegramMemories.withContact}`,
  )

  const widgetMemories = await countMemories(admin, demo.brainId, 'widget_chat')
  record('T2 widget memory created', widgetMemories.count >= 1, `count=${widgetMemories.count}`)
  record(
    'T2 widget memory has contact_id',
    widgetMemories.withContact >= 1,
    `with_contact=${widgetMemories.withContact}`,
  )

  const fathomMemories = await countMemories(admin, demo.brainId, 'fathom_call')
  record('T3 fathom memory created', fathomMemories.count >= 1, `count=${fathomMemories.count}`)

  // ── T2 negative: anonymous widget conversation produced nothing ──────────
  const { count: anonOutbox } = await admin
    .from('brain_ops_outbox')
    .select('id', { count: 'exact', head: true })
    .like('dedupe_key', `interaction-%-${anonWidget.conversationId}-%`)
  record(
    'T2 anonymous widget produced no outbox rows',
    (anonOutbox ?? 0) === 0,
    `rows=${anonOutbox}`,
  )

  // ── T6: idempotency — wait two more sweep cycles, counts must not grow ───
  console.log('T6: waiting 25s for additional sweep cycles...')
  await sleep(25_000)
  const telegramAfter = await countMemories(admin, demo.brainId, 'telegram_chat')
  const widgetAfter = await countMemories(admin, demo.brainId, 'widget_chat')
  record(
    'T6 no duplicate memories after extra sweeps',
    telegramAfter.count === telegramMemories.count && widgetAfter.count === widgetMemories.count,
    `telegram ${telegramMemories.count}→${telegramAfter.count}, widget ${widgetMemories.count}→${widgetAfter.count}`,
  )

  if (!keep) {
    console.log('cleaning up smoke rows...')
    for (const fn of cleanup.reverse()) {
      await fn().catch((err) => console.warn(`cleanup step failed: ${(err as Error).message}`))
    }
    await admin
      .from('ns_memories')
      .delete()
      .eq('brain_id', demo.brainId)
      .gte('created_at', runStartedAt)
      .in('source_type', ['telegram_chat', 'widget_chat', 'fathom_call'])
  }

  printReport()
  if (checks.some((c) => !c.ok)) process.exit(1)
}

// ── Demo account resolution ─────────────────────────────────────────────────

async function resolveDemoAccount(admin: SupabaseClient): Promise<{
  userId: string
  orgId: string
  brainId: string
}> {
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('id')
    .eq('email', DEMO_EMAIL)
    .maybeSingle()
  if (profileError || !profile?.id) {
    throw new Error(`Demo profile ${DEMO_EMAIL} not found — run \`pnpm seed:yc-demo\` first`)
  }

  const { data: org } = await admin
    .from('organizations')
    .select('id')
    .eq('name', 'Foundry Creative')
    .maybeSingle()
  if (!org?.id) throw new Error('Demo org "Foundry Creative" not found — run the seeder')

  const { data: brain } = await admin
    .from('ns_brains')
    .select('id')
    .eq('scope', 'customer')
    .eq('cortex_max', true)
    .eq('org_id', org.id)
    .maybeSingle()
  if (!brain?.id) throw new Error('Enabled customer brain not found for demo org')

  return { userId: String(profile.id), orgId: String(org.id), brainId: String(brain.id) }
}

// ── Channel seeding (mirrors production write paths) ───────────────────────

const TELEGRAM_SCRIPT = [
  ['user', 'Hey, I run a 7-figure ecommerce brand and our retention is terrible.'],
  ['assistant', 'What does your current post-purchase flow look like?'],
  [
    'user',
    'Honestly just one thank-you email. I believe email is dead anyway, SMS is where my buyers live.',
  ],
  ['assistant', 'Interesting — what makes you say that?'],
  [
    'user',
    'Open rates tanked last year. I decided to move the whole budget to SMS and WhatsApp this quarter.',
  ],
  [
    'user',
    'My goal is 30% repeat purchase rate by December. Budget is around 5k per month for tooling.',
  ],
] as const

const WIDGET_SCRIPT = [
  ['user', 'Hi, I saw your funnel templates. I run a coaching business for dentists.'],
  ['assistant', 'Welcome! What are you trying to improve right now?'],
  [
    'user',
    'My webinar shows up rate is 12%. I think the problem is my reminder sequence is boring.',
  ],
  ['user', 'I prefer done-for-you services over courses, I have no time to learn another tool.'],
] as const

async function seedTelegramConversation(
  admin: SupabaseClient,
  demo: { userId: string; orgId: string },
): Promise<{ conversationId: string; contactId: string }> {
  const chatId = `smoke-${runId}`

  const { data: contact, error: contactError } = await admin
    .from('contacts')
    .insert({
      user_id: demo.userId,
      org_id: demo.orgId,
      first_name: 'Smoke',
      last_name: `Telegram ${runId}`,
      source: 'manual',
      contact_source: 'telegram',
      contact_source_detail: 'smoke-test',
      contact_type: 'lead',
      tags: ['smoke-test'],
    })
    .select('id')
    .single()
  if (contactError || !contact?.id) {
    throw new Error(`Failed to create telegram smoke contact: ${contactError?.message}`)
  }
  cleanup.push(async () => {
    await admin.from('contact_identifiers').delete().eq('contact_id', contact.id)
    await admin.from('contacts').delete().eq('id', contact.id)
  })

  await admin.from('contact_identifiers').upsert(
    {
      contact_id: contact.id,
      kind: 'telegram_chat_id',
      value: chatId,
      confidence: 1,
      source: 'smoke-test',
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: 'kind,value' },
  )

  const conversationId = await insertConversation(admin, {
    user_id: demo.userId,
    org_id: demo.orgId,
    title: `Telegram Chat (smoke ${runId})`,
    agent_id: 'vibey',
    contact_id: contact.id,
    metadata: { telegram_chat_id: chatId, source: 'telegram', smoke_test: true },
  })

  await insertMessages(admin, conversationId, TELEGRAM_SCRIPT)
  return { conversationId, contactId: String(contact.id) }
}

async function seedWidgetConversation(
  admin: SupabaseClient,
  demo: { userId: string; orgId: string },
): Promise<{ conversationId: string }> {
  const conversationId = await insertConversation(admin, {
    user_id: demo.userId,
    org_id: demo.orgId,
    title: `Widget Chat (smoke ${runId})`,
    agent_id: 'vibey',
    metadata: {
      public: true,
      visitor_id: `smoke-vis-${runId}`,
      visitor_email: `smoke-widget-${runId}@example.com`,
      visitor_name: 'Smoke Visitor',
      smoke_test: true,
    },
  })
  await insertMessages(admin, conversationId, WIDGET_SCRIPT)
  return { conversationId }
}

async function seedAnonymousWidgetConversation(
  admin: SupabaseClient,
  demo: { userId: string; orgId: string },
): Promise<{ conversationId: string }> {
  const conversationId = await insertConversation(admin, {
    user_id: demo.userId,
    org_id: demo.orgId,
    title: `Anonymous Widget Chat (smoke ${runId})`,
    agent_id: 'vibey',
    metadata: { public: true, visitor_id: `smoke-anon-${runId}`, smoke_test: true },
  })
  await insertMessages(admin, conversationId, WIDGET_SCRIPT)
  return { conversationId }
}

async function insertConversation(
  admin: SupabaseClient,
  payload: Record<string, unknown>,
): Promise<string> {
  const { data, error } = await admin.from('conversations').insert(payload).select('id').single()
  if (error || !data?.id) throw new Error(`Failed to insert conversation: ${error?.message}`)
  const id = String(data.id)
  cleanup.push(async () => {
    await admin.from('messages').delete().eq('conversation_id', id)
    await admin.from('brain_ops_outbox').delete().like('dedupe_key', `interaction-%-${id}-%`)
    await admin.from('conversations').delete().eq('id', id)
  })
  return id
}

async function insertMessages(
  admin: SupabaseClient,
  conversationId: string,
  script: ReadonlyArray<readonly [string, string]>,
): Promise<void> {
  // Backdate well past any grace window so the sweeper flushes immediately.
  const base = Date.now() - script.length * 60_000 - 2 * 60 * 60 * 1000
  const rows = script.map(([role, content], index) => ({
    conversation_id: conversationId,
    role,
    content,
    created_at: new Date(base + index * 60_000).toISOString(),
    metadata: { smoke_test: true },
  }))
  const { error } = await admin.from('messages').insert(rows)
  if (error) throw new Error(`Failed to insert messages: ${error.message}`)
}

// ── Fathom webhook leg ──────────────────────────────────────────────────────

async function postFathomWebhook(admin: SupabaseClient, demo: { userId: string }): Promise<string> {
  const { data: integration } = await admin
    .from('user_integrations')
    .select('id')
    .eq('user_id', demo.userId)
    .eq('integration_id', 'fathom')
    .eq('status', 'connected')
    .maybeSingle()
  if (!integration?.id) {
    const { error } = await admin.from('user_integrations').insert({
      user_id: demo.userId,
      integration_id: 'fathom',
      provider: 'fathom',
      scope_mode: 'personal',
      status: 'connected',
      connected_at: new Date().toISOString(),
      metadata: { auto_ingest: true, smoke_test: true },
    })
    if (error) throw new Error(`Failed to seed fathom integration: ${error.message}`)
    cleanup.push(async () => {
      await admin
        .from('user_integrations')
        .delete()
        .eq('user_id', demo.userId)
        .eq('integration_id', 'fathom')
        .eq('metadata->>smoke_test', 'true')
    })
  }

  const meetingId = `smoke-fathom-${runId}`
  const event = {
    id: meetingId,
    title: `Smoke discovery call ${runId}`,
    started_at: new Date().toISOString(),
    recorded_by: { email: DEMO_EMAIL, name: 'Demo Founder' },
    calendar_invitees: [
      { email: DEMO_EMAIL, name: 'Demo Founder' },
      { email: `smoke-client-${runId}@example.com`, name: 'Smoke Client' },
    ],
    transcript: [
      {
        speaker: { display_name: 'Smoke Client' },
        text: 'We are a dental clinic group doing about 2 million a year and our biggest problem is no-shows.',
        timestamp: '1',
      },
      {
        speaker: { display_name: 'Demo Founder' },
        text: 'What have you tried so far to reduce them?',
        timestamp: '2',
      },
      {
        speaker: { display_name: 'Smoke Client' },
        text: 'SMS reminders, but I decided this year to invest in a full patient-journey automation. Budget is 30k.',
        timestamp: '3',
      },
    ],
  }

  const res = await fetch(`${platformApiUrl}/api/integrations/fathom/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  })
  if (!res.ok) throw new Error(`Fathom webhook POST failed: ${res.status} ${res.statusText}`)
  console.log(`fathom webhook accepted meeting=${meetingId}`)
  cleanup.push(async () => {
    await admin.from('brain_ops_outbox').delete().like('dedupe_key', `%${meetingId}%`)
    await admin
      .from('brain_import_jobs')
      .delete()
      .eq('user_id', demo.userId)
      .eq('dedupe_key', `fathom:${meetingId}`)
  })
  return meetingId
}

// ── Polling + assertions ────────────────────────────────────────────────────

async function outboxDone(admin: SupabaseClient, dedupePrefix: string): Promise<boolean> {
  const { data } = await admin
    .from('brain_ops_outbox')
    .select('id, status')
    .like('dedupe_key', `${dedupePrefix}%`)
    .limit(10)
  const rows = data ?? []
  if (rows.length === 0) return false
  if (rows.some((r) => r.status === 'failed')) {
    throw new Error(`Outbox row failed for ${dedupePrefix}`)
  }
  return rows.every((r) => r.status === 'done')
}

async function countMemories(
  admin: SupabaseClient,
  brainId: string,
  sourceType: string,
): Promise<{ count: number; withContact: number }> {
  const { data } = await admin
    .from('ns_memories')
    .select('id, contact_id')
    .eq('brain_id', brainId)
    .eq('source_type', sourceType)
    .gte('created_at', runStartedAt)
  const rows = data ?? []
  return { count: rows.length, withContact: rows.filter((r) => r.contact_id).length }
}

async function pollUntil(name: string, predicate: () => Promise<boolean>): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      if (await predicate()) {
        record(name, true)
        return
      }
    } catch (err) {
      record(name, false, (err as Error).message)
      return
    }
    await sleep(pollMs)
  }
  record(name, false, `timed out after ${timeoutMs}ms`)
}

function record(name: string, ok: boolean, detail?: string): void {
  checks.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` (${detail})` : ''}`)
}

function printReport(): void {
  const failed = checks.filter((c) => !c.ok)
  console.log('')
  console.log('────────────────────────────────────────')
  console.log(`customer-signal smoke: ${checks.length - failed.length}/${checks.length} passed`)
  for (const check of failed) {
    console.log(`  FAILED: ${check.name}${check.detail ? ` — ${check.detail}` : ''}`)
  }
  console.log('────────────────────────────────────────')
}

// ── Utilities ───────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '')
}

function loadEnvFile(path: string): void {
  const content = readFileSync(path, 'utf8')
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const equalsIndex = line.indexOf('=')
    if (equalsIndex <= 0) continue
    const key = line.slice(0, equalsIndex).trim()
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue
    if (process.env[key] !== undefined) continue
    const rawValue = line.slice(equalsIndex + 1).trim()
    process.env[key] = rawValue.replace(/^['"]|['"]$/g, '')
  }
}

main().catch((err) => {
  console.error(`customer-signal smoke crashed: ${(err as Error).message}`)
  process.exit(1)
})
