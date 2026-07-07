import { randomUUID } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

type AuthHeaders = Record<string, string>
type SmokeEvent = Record<string, unknown> & { type?: string }

type WorkloadResult = {
  workload: string
  queue: string
  ok: boolean
  error?: string
  sentAt: number
  acceptedAt?: number
  startedAt?: number
  finishedAt?: number
  acceptMs?: number
  startMs?: number
  totalMs?: number
  processMs?: number
  meta?: Record<string, unknown>
}

const repoRoot = resolve(__dirname, '../..')
for (const envFile of [
  resolve(repoRoot, 'apps/api/.env'),
  resolve(repoRoot, 'apps/agent-api/.env'),
]) {
  if (existsSync(envFile)) loadEnvFile(envFile)
}

const platformApiUrl = trimTrailingSlash(
  process.env.VIBEY_SMOKE_PLATFORM_API_URL ?? 'http://localhost:3001',
)
const agentApiUrl = trimTrailingSlash(
  process.env.VIBEY_SMOKE_AGENT_API_URL ?? 'http://localhost:3003',
)
const orgId = process.env.VIBEY_SMOKE_ORG_ID?.trim() || '9fb9a0c1-7ce1-4d1a-9b4d-e68817e8f800'
const chatCount = Number(process.env.VIBEY_SMOKE_CHAT_COUNT ?? '2')
const pollMs = Number(process.env.VIBEY_SMOKE_POLL_MS ?? '2000')
const timeoutMs = Number(process.env.VIBEY_SMOKE_TIMEOUT_MS ?? '300000')

async function main(): Promise<void> {
  const auth = await resolveAuthHeaders()
  console.log(`platform=${platformApiUrl}`)
  console.log(`agent=${agentApiUrl}`)
  console.log(`org=${orgId}`)
  console.log(`chat_count=${chatCount}`)
  console.log('')

  await assertServicesReachable(auth)

  const automationTarget = await discoverAutomationTarget(auth).catch(() => null)
  if (automationTarget) {
    console.log(
      `automation target: space=${automationTarget.spaceId} automation=${automationTarget.automationId} trigger=${automationTarget.triggerType} form=${automationTarget.formId}`,
    )
  } else {
    console.log('automation target: none found (automation workload will be skipped)')
  }
  console.log('')

  const wallStart = now()
  const results = await Promise.all([
    ...Array.from({ length: chatCount }, (_, index) => runChat(auth, index + 1)),
    runMission(auth),
    runBrainImport(auth),
    automationTarget
      ? runAutomation(auth, automationTarget)
      : Promise.resolve(
          skippedResult('automation', 'agent-runtime-queue-automation', 'no matching automation'),
        ),
  ])

  const wallMs = now() - wallStart
  printReport(results, wallMs)
  const failed = results.filter((result) => !result.ok)
  if (failed.length > 0) process.exit(1)
}

async function runChat(auth: AuthHeaders, index: number): Promise<WorkloadResult> {
  const workload = `chat-${index}`
  const queue = 'agent-runtime-queue-chat'
  const sentAt = now()
  let conversationId = ''
  try {
    const conversation = await requestJson<{ id: string }>(`${agentApiUrl}/api/conversations`, {
      method: 'POST',
      headers: jsonHeaders(auth),
      body: JSON.stringify({
        title: `Runtime smoke chat ${index} ${new Date().toISOString()}`,
        agent_id: 'vibey',
        metadata: { smoke_test: true, smoke_id: randomUUID(), workload },
      }),
    })
    conversationId = conversation.id

    const response = await fetch(`${agentApiUrl}/api/chat`, {
      method: 'POST',
      headers: jsonHeaders(auth),
      body: JSON.stringify({
        conversation_id: conversation.id,
        content: `Runtime smoke ${index}. Reply with exactly: PONG-${index}`,
        model: 'openai/gpt-5.5',
        model_settings: {
          context_window_tokens: 272000,
          reasoning_effort: 'none',
          speed_mode: 'standard',
        },
      }),
    })

    const acceptedAt = now()
    const events = await readSseEvents(response)
    const firstProgress = events.find((event) =>
      [
        'content',
        'text',
        'message',
        'assistant',
        'delta',
        'content_delta',
        'message_start',
      ].includes(String(event.type ?? '')),
    )
    const done = events.find((event) => event.type === 'done')
    const errorEvent = events.find((event) => event.type === 'error')
    const finishedAt = now()

    if (!response.ok && response.status !== 201) {
      throw new Error(`chat HTTP ${response.status}: ${formatEventSummary(events)}`)
    }
    if (errorEvent) {
      throw new Error(`chat error event: ${formatEventSummary(events)}`)
    }
    if (!done) {
      throw new Error(`chat missing done event: ${formatEventSummary(events)}`)
    }

    return finalizeTiming({
      workload,
      queue,
      ok: true,
      sentAt,
      acceptedAt,
      startedAt: firstProgress ? acceptedAt : undefined,
      finishedAt,
      meta: {
        conversationId,
        httpStatus: response.status,
        eventTypes: events.map((event) => event.type ?? 'unknown'),
      },
    })
  } catch (error) {
    return finalizeTiming({
      workload,
      queue,
      ok: false,
      sentAt,
      finishedAt: now(),
      error: error instanceof Error ? error.message : String(error),
      meta: conversationId ? { conversationId } : undefined,
    })
  } finally {
    if (conversationId) {
      await fetch(`${agentApiUrl}/api/conversations/${conversationId}`, {
        method: 'DELETE',
        headers: auth,
      }).catch(() => undefined)
    }
  }
}

async function runMission(auth: AuthHeaders): Promise<WorkloadResult> {
  const workload = 'mission'
  const queue = 'agent-runtime-queue-mission'
  const sentAt = now()
  try {
    const created = await requestJson<{ id: string; status?: string }>(
      `${platformApiUrl}/api/missions`,
      {
        method: 'POST',
        headers: jsonHeaders(auth),
        body: JSON.stringify({
          title: `Runtime smoke mission ${new Date().toISOString()}`,
          brief: 'Single-step smoke test. Reply exactly PONG.',
          priority: 'low',
          idempotency_key: `runtime-smoke-${randomUUID()}`,
        }),
      },
    )

    const acceptedAt = now()
    let approved = false

    const terminal = new Set(['done', 'error', 'failed'])
    const active = new Set([
      'planning',
      'todo',
      'in_progress',
      'review',
      'awaiting_human',
      'blocked',
    ])
    let startedAt: number | undefined
    const deadline = now() + timeoutMs
    let mission = created

    while (now() < deadline) {
      mission = await requestJson<{ id: string; status?: string }>(
        `${platformApiUrl}/api/missions/${created.id}`,
        { headers: auth },
      )
      const status = String(mission.status ?? '')

      if (!approved && status === 'pending_approval') {
        await requestJson(`${platformApiUrl}/api/missions/${created.id}/approve-plan`, {
          method: 'POST',
          headers: jsonHeaders(auth),
          body: JSON.stringify({}),
        })
        approved = true
      }

      if (!startedAt && active.has(status)) startedAt = now()
      if (terminal.has(status)) {
        return finalizeTiming({
          workload,
          queue,
          ok: status === 'done',
          sentAt,
          acceptedAt,
          startedAt,
          finishedAt: now(),
          error: status === 'done' ? undefined : `mission ended in ${status}`,
          meta: { missionId: created.id, finalStatus: status },
        })
      }
      await sleep(pollMs)
    }

    throw new Error(`mission timed out after ${timeoutMs}ms (last=${String(mission.status)})`)
  } catch (error) {
    return finalizeTiming({
      workload,
      queue,
      ok: false,
      sentAt,
      finishedAt: now(),
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

async function runBrainImport(auth: AuthHeaders): Promise<WorkloadResult> {
  const workload = 'brain-import'
  const queue = 'agent-runtime-queue-brain-import'
  const sentAt = now()
  const unique = `Runtime smoke brain note ${new Date().toISOString()} ${randomUUID()}`
  try {
    const accepted = await requestJson<{ jobId?: string; status?: string; deduped?: boolean }>(
      `${platformApiUrl}/api/brain/remember`,
      {
        method: 'POST',
        headers: jsonHeaders(auth),
        body: JSON.stringify({
          content: unique,
          source_type: 'document',
          source_title: 'Runtime smoke brain import',
        }),
      },
    )

    const acceptedAt = now()
    const jobId = accepted.jobId
    if (!jobId) throw new Error(`brain remember missing jobId: ${JSON.stringify(accepted)}`)

    const terminal = new Set(['succeeded', 'failed', 'cancelled'])
    const active = new Set(['processing', 'retry'])
    let startedAt: number | undefined
    const deadline = now() + timeoutMs
    let lastStatus = String(accepted.status ?? 'queued')

    while (now() < deadline) {
      const response = await requestJson<{
        job?: { status?: string; last_error?: string | null }
        status?: string
        last_error?: string | null
      }>(`${platformApiUrl}/api/brain/import-jobs/${jobId}`, { headers: auth })
      const job = response.job ?? response
      lastStatus = String(job.status ?? 'unknown')
      if (!startedAt && active.has(lastStatus)) startedAt = now()
      if (terminal.has(lastStatus)) {
        return finalizeTiming({
          workload,
          queue,
          ok: lastStatus === 'succeeded',
          sentAt,
          acceptedAt,
          startedAt,
          finishedAt: now(),
          error:
            lastStatus === 'succeeded'
              ? undefined
              : (job.last_error ?? `brain import ended in ${lastStatus}`),
          meta: { jobId, finalStatus: lastStatus, deduped: accepted.deduped ?? false },
        })
      }
      await sleep(pollMs)
    }

    throw new Error(`brain import timed out after ${timeoutMs}ms (last=${lastStatus})`)
  } catch (error) {
    return finalizeTiming({
      workload,
      queue,
      ok: false,
      sentAt,
      finishedAt: now(),
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

type AutomationTarget = {
  triggerType: 'form_submitted'
  spaceId: string
  automationId: string
  formId: string
  automationName?: string
}

async function discoverAutomationTarget(auth: AuthHeaders): Promise<AutomationTarget | null> {
  const spaces = await requestJson<Array<{ id: string; name?: string }>>(
    `${platformApiUrl}/api/spaces?limit=50`,
    {
      headers: auth,
    },
  )

  for (const space of spaces) {
    const automations = await requestJson<Array<Record<string, unknown>>>(
      `${platformApiUrl}/api/spaces/${space.id}/automations`,
      { headers: auth },
    )

    const candidate = automations.find((automation) => {
      if (automation.is_draft === true || automation.enabled === false) return false
      const trigger = automation.trigger as { type?: string; form_id?: string } | undefined
      return (
        trigger?.type === 'form_submitted' &&
        typeof trigger.form_id === 'string' &&
        trigger.form_id.length > 0
      )
    })
    if (!candidate?.id) continue

    const trigger = candidate.trigger as { form_id: string }
    return {
      triggerType: 'form_submitted',
      spaceId: space.id,
      automationId: String(candidate.id),
      formId: trigger.form_id,
      automationName: typeof candidate.name === 'string' ? candidate.name : undefined,
    }
  }

  return null
}

async function runAutomation(auth: AuthHeaders, target: AutomationTarget): Promise<WorkloadResult> {
  const workload = 'automation'
  const queue = 'agent-runtime-queue-automation'
  const sentAt = now()
  try {
    const runsBefore = await requestJson<Array<{ id: string; created_at?: string }>>(
      `${platformApiUrl}/api/spaces/${target.spaceId}/automations/runs`,
      { headers: auth },
    )
    const beforeIds = new Set(runsBefore.map((run) => run.id))

    const created = await requestJson<{ id: string; status?: string }>(
      `${platformApiUrl}/api/spaces/${target.spaceId}/items`,
      {
        method: 'POST',
        headers: jsonHeaders(auth),
        body: JSON.stringify({
          title: `Runtime smoke form ${new Date().toISOString()}`,
          status: 'todo',
          form_id: target.formId,
          custom_data: {
            name: `Smoke Lead ${randomUUID().slice(0, 8)}`,
            email: `smoke-${Date.now()}@vibey.im`,
            _source: 'form',
          },
        }),
      },
    )

    const acceptedAt = now()
    const deadline = now() + timeoutMs
    let startedAt: number | undefined
    let matchedRun: Record<string, unknown> | null = null

    while (now() < deadline) {
      const runs = await requestJson<Array<Record<string, unknown>>>(
        `${platformApiUrl}/api/spaces/${target.spaceId}/automations/runs`,
        { headers: auth },
      )
      matchedRun =
        runs.find(
          (run) =>
            String(run.item_id ?? '') === created.id &&
            String(run.automation_id) === target.automationId,
        ) ??
        runs.find(
          (run) =>
            !beforeIds.has(String(run.id)) && String(run.automation_id) === target.automationId,
        ) ??
        runs.find((run) => !beforeIds.has(String(run.id))) ??
        null

      if (matchedRun) {
        if (!startedAt) startedAt = now()
        const status = String(matchedRun.status ?? '')
        if (['success', 'partial', 'failed'].includes(status)) {
          return finalizeTiming({
            workload,
            queue,
            ok: status === 'success' || status === 'partial',
            sentAt,
            acceptedAt,
            startedAt,
            finishedAt: now(),
            error:
              status === 'success' || status === 'partial'
                ? undefined
                : `automation run ended in ${status}`,
            meta: {
              runId: matchedRun.id,
              finalStatus: status,
              triggerType: target.triggerType,
              formId: target.formId,
              itemId: created.id,
              automationName: target.automationName,
            },
          })
        }
      }
      await sleep(pollMs)
    }

    throw new Error('automation timed out waiting for run row')
  } catch (error) {
    return finalizeTiming({
      workload,
      queue,
      ok: false,
      sentAt,
      finishedAt: now(),
      error: error instanceof Error ? error.message : String(error),
      meta: {
        spaceId: target.spaceId,
        automationId: target.automationId,
        formId: target.formId,
        triggerType: target.triggerType,
      },
    })
  }
}

async function assertServicesReachable(auth: AuthHeaders): Promise<void> {
  await requestJson(`${platformApiUrl}/api/models`, { headers: auth })
  await requestJson(`${agentApiUrl}/api/models`, { headers: auth }).catch(async () => {
    await fetch(`${agentApiUrl}/api/conversations`, { headers: auth })
  })
}

function skippedResult(workload: string, queue: string, reason: string): WorkloadResult {
  const sentAt = now()
  return finalizeTiming({
    workload,
    queue,
    ok: true,
    sentAt,
    acceptedAt: sentAt,
    finishedAt: sentAt,
    meta: { skipped: true, reason },
  })
}

function finalizeTiming(
  input: Omit<WorkloadResult, 'acceptMs' | 'startMs' | 'totalMs' | 'processMs'>,
): WorkloadResult {
  const acceptedAt = input.acceptedAt ?? input.finishedAt
  const finishedAt = input.finishedAt ?? now()
  const startedAt = input.startedAt
  return {
    ...input,
    acceptedAt,
    finishedAt,
    acceptMs: acceptedAt != null ? acceptedAt - input.sentAt : undefined,
    startMs: startedAt != null ? startedAt - input.sentAt : undefined,
    processMs:
      startedAt != null
        ? finishedAt - startedAt
        : acceptedAt != null
          ? finishedAt - acceptedAt
          : undefined,
    totalMs: finishedAt - input.sentAt,
  }
}

function printReport(results: WorkloadResult[], wallMs: number): void {
  console.log('=== Runtime queue mixed smoke ===')
  console.log('')
  console.log(
    pad('workload', 14),
    pad('queue', 34),
    pad('ok', 4),
    pad('accept', 8),
    pad('start', 8),
    pad('process', 8),
    pad('total', 8),
    'notes',
  )
  for (const result of results) {
    console.log(
      pad(result.workload, 14),
      pad(result.queue, 34),
      pad(result.ok ? 'yes' : 'no', 4),
      pad(ms(result.acceptMs), 8),
      pad(ms(result.startMs), 8),
      pad(ms(result.processMs), 8),
      pad(ms(result.totalMs), 8),
      result.error ?? JSON.stringify(result.meta ?? {}),
    )
  }
  console.log('')
  console.log(`wall_clock_parallel_ms=${wallMs}`)
  const okCount = results.filter((result) => result.ok).length
  console.log(`passed=${okCount}/${results.length}`)
}

function pad(value: string, width: number): string {
  return value.padEnd(width)
}

function ms(value: number | undefined): string {
  return value == null ? '-' : `${value}ms`
}

async function resolveAuthHeaders(): Promise<AuthHeaders> {
  const explicitToken = process.env.VIBEY_SMOKE_ACCESS_TOKEN?.trim()
  if (explicitToken) {
    return { Authorization: `Bearer ${explicitToken}`, 'x-org-id': orgId }
  }

  const email = process.env.VIBEY_SMOKE_EMAIL?.trim()
  const password = process.env.VIBEY_SMOKE_PASSWORD?.trim()
  const supabaseUrl = process.env.SUPABASE_URL?.trim()
  const anonKey = process.env.SUPABASE_ANON_KEY?.trim()
  if (email && password && supabaseUrl && anonKey) {
    const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: anonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const text = await response.text()
    if (!response.ok) throw new Error(`Supabase smoke sign-in failed: ${text}`)
    const session = JSON.parse(text) as { access_token?: string }
    if (!session.access_token) throw new Error('Supabase smoke sign-in missing access_token')
    return { Authorization: `Bearer ${session.access_token}`, 'x-org-id': orgId }
  }

  throw new Error('Set VIBEY_SMOKE_ACCESS_TOKEN or VIBEY_SMOKE_EMAIL + VIBEY_SMOKE_PASSWORD')
}

async function requestJson<T>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, init)
  const text = await response.text()
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}: ${text}`)
  }
  return (text ? JSON.parse(text) : null) as T
}

async function readSseEvents(response: Response): Promise<SmokeEvent[]> {
  const text = await response.text()
  const events: SmokeEvent[] = []
  for (const block of text.split(/\n\n+/)) {
    const dataLines = block
      .split('\n')
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.replace(/^data:\s?/, '').trim())
      .filter(Boolean)
    for (const data of dataLines) {
      if (data === '[DONE]') continue
      try {
        events.push(JSON.parse(data) as SmokeEvent)
      } catch {
        events.push({ type: 'unparseable', raw: data })
      }
    }
  }
  return events
}

function jsonHeaders(headers: AuthHeaders): AuthHeaders {
  return { ...headers, 'Content-Type': 'application/json' }
}

function formatEventSummary(events: SmokeEvent[]): string {
  return events.map((event) => event.type ?? 'unknown').join(', ')
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
    process.env[key] = unquoteEnvValue(rawValue)
  }
}

function unquoteEnvValue(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1)
  }
  const commentIndex = value.indexOf(' #')
  return commentIndex === -1 ? value : value.slice(0, commentIndex).trim()
}

function now(): number {
  return Date.now()
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms))
}

main().catch((error) => {
  console.error(`FAIL ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
