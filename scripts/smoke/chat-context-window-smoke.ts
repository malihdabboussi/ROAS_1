import { randomUUID } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

type AuthHeaders = Record<string, string>

type SmokeEvent = Record<string, unknown> & { type?: string }

type ModelOption = {
  id: string
  label?: string
  contextOptions?: Array<{ tokens: number; label?: string }>
}

type Conversation = {
  id: string
}

type Message = {
  id: string
  role: string
  metadata?: Record<string, unknown> | null
}

const repoRoot = resolve(__dirname, '../..')
const envFiles = [
  resolve(repoRoot, 'apps/api/.env'),
  resolve(repoRoot, 'apps/agent-api/.env'),
  resolve(repoRoot, 'apps/web/.env'),
]

for (const envFile of envFiles) {
  if (existsSync(envFile)) loadEnvFile(envFile)
}

const platformApiUrl = trimTrailingSlash(
  process.env.VIBEY_SMOKE_PLATFORM_API_URL ?? 'http://localhost:3001',
)
const agentApiUrl = trimTrailingSlash(
  process.env.VIBEY_SMOKE_AGENT_API_URL ?? 'http://localhost:3003',
)
const modelId = process.env.VIBEY_SMOKE_MODEL_ID ?? 'openai/gpt-5.5'
const expectedContextTokens = parseCsvNumbers(
  process.env.VIBEY_SMOKE_EXPECTED_CONTEXTS ?? '272000,1050000',
)
const contextSmokeTokens = Number(process.env.VIBEY_SMOKE_CONTEXT_TOKENS ?? '272000')
const invalidContextTokens = Number(process.env.VIBEY_SMOKE_INVALID_CONTEXT_TOKENS ?? '123456789')
const orgId = process.env.VIBEY_SMOKE_ORG_ID?.trim() || null
const runLive = process.env.VIBEY_SMOKE_LIVE !== '0'
const runExpensive = process.env.LIVE_EXPENSIVE_CONTEXT_TEST === '1'

async function main(): Promise<void> {
  const authHeaders = await resolveAuthHeaders()
  logStep(`platform=${platformApiUrl}`)
  logStep(`agent=${agentApiUrl}`)
  logStep(`model=${modelId}`)

  await verifyModelCatalog(authHeaders)

  if (!runLive) {
    logPass('catalog-only smoke completed; set VIBEY_SMOKE_LIVE=1 or omit it to run live chat')
    return
  }

  await verifyInvalidContextRejected(authHeaders)
  await verifySelectedContextRoundTrip(authHeaders, contextSmokeTokens)

  if (runExpensive) {
    throw new Error(
      'LIVE_EXPENSIVE_CONTEXT_TEST=1 is reserved for a future >272K prompt-cost smoke. This script intentionally does not generate a huge paid prompt yet.',
    )
  }

  logPass('chat context window smoke completed')
}

async function resolveAuthHeaders(): Promise<AuthHeaders> {
  const explicitToken = process.env.VIBEY_SMOKE_ACCESS_TOKEN?.trim()
  if (explicitToken) {
    return withOrgHeader({ Authorization: `Bearer ${explicitToken}` })
  }

  const internalToken = process.env.INTERNAL_API_TOKEN?.trim()
  const internalUserId = process.env.VIBEY_SMOKE_USER_ID?.trim() || process.env.USER_ID?.trim()
  if (internalToken && internalUserId) {
    return withOrgHeader({
      'x-internal-token': internalToken,
      'x-user-id': internalUserId,
    })
  }

  const email = process.env.VIBEY_SMOKE_EMAIL?.trim()
  const password = process.env.VIBEY_SMOKE_PASSWORD?.trim()
  const supabaseUrl =
    process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const anonKey =
    process.env.SUPABASE_ANON_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

  if (email && password && supabaseUrl && anonKey) {
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !data.session?.access_token) {
      throw new Error(`Supabase smoke sign-in failed: ${error?.message ?? 'missing session'}`)
    }
    return withOrgHeader({
      Authorization: `Bearer ${data.session.access_token}`,
      ...(data.session.refresh_token
        ? { 'x-supabase-refresh-token': data.session.refresh_token }
        : {}),
    })
  }

  throw new Error(
    [
      'Missing smoke auth.',
      'Set one of:',
      '- VIBEY_SMOKE_ACCESS_TOKEN',
      '- INTERNAL_API_TOKEN + USER_ID or VIBEY_SMOKE_USER_ID',
      '- VIBEY_SMOKE_EMAIL + VIBEY_SMOKE_PASSWORD + SUPABASE_URL + SUPABASE_ANON_KEY',
    ].join('\n'),
  )
}

function withOrgHeader(headers: AuthHeaders): AuthHeaders {
  return orgId ? { ...headers, 'x-org-id': orgId } : headers
}

async function verifyModelCatalog(authHeaders: AuthHeaders): Promise<void> {
  const models = await requestJson<ModelOption[]>(`${platformApiUrl}/api/models`, {
    headers: authHeaders,
  })
  const model = models.find((item) => item.id === modelId)
  assert(model, `model catalog does not include ${modelId}`)

  const availableContexts = new Set((model.contextOptions ?? []).map((item) => item.tokens))
  for (const expected of expectedContextTokens) {
    assert(
      availableContexts.has(expected),
      `${modelId} missing context option ${expected}; got ${[...availableContexts].join(', ')}`,
    )
  }

  logPass(
    `catalog exposes ${modelId} contexts: ${[...availableContexts]
      .sort((a, b) => a - b)
      .join(', ')}`,
  )
}

async function verifyInvalidContextRejected(authHeaders: AuthHeaders): Promise<void> {
  const conversation = await createConversation(authHeaders, 'context-invalid')
  try {
    const response = await fetch(`${agentApiUrl}/api/chat`, {
      method: 'POST',
      headers: jsonHeaders(authHeaders),
      body: JSON.stringify({
        conversation_id: conversation.id,
        content: 'Smoke test invalid context. Do not answer.',
        model: modelId,
        model_settings: {
          context_window_tokens: invalidContextTokens,
          reasoning_effort: 'none',
          speed_mode: 'standard',
        },
      }),
    })

    const events = await readSseEvents(response)
    const hasError = !response.ok || events.some((event) => event.type === 'error')
    const hasDone = events.some((event) => event.type === 'done')

    assert(
      hasError && !hasDone,
      `invalid context was not rejected as expected; status=${response.status} events=${events
        .map((event) => event.type ?? 'unknown')
        .join(', ')}`,
    )
    logPass(`invalid context ${invalidContextTokens} rejected`)
  } finally {
    await deleteConversation(authHeaders, conversation.id)
  }
}

async function verifySelectedContextRoundTrip(
  authHeaders: AuthHeaders,
  contextTokens: number,
): Promise<void> {
  const conversation = await createConversation(authHeaders, `context-${contextTokens}`)
  try {
    const response = await fetch(`${agentApiUrl}/api/chat`, {
      method: 'POST',
      headers: jsonHeaders(authHeaders),
      body: JSON.stringify({
        conversation_id: conversation.id,
        content: 'Smoke test. Reply with OK only.',
        model: modelId,
        model_settings: {
          context_window_tokens: contextTokens,
          reasoning_effort: 'none',
          speed_mode: 'standard',
        },
        system_context: 'This is an automated smoke test. Reply exactly OK.',
      }),
    })
    if (!response.ok) {
      throw new Error(`chat request failed HTTP ${response.status}: ${await response.text()}`)
    }

    const events = await readSseEvents(response)
    const done = events.find((event) => event.type === 'done')
    assert(done, `chat stream did not emit done; events=${formatEventSummary(events)}`)
    assert(
      done.context_window === contextTokens,
      `done.context_window expected ${contextTokens}, got ${String(done.context_window)}`,
    )

    const modelSettings = asRecord(done.model_settings)
    assert(
      modelSettings?.context_window_tokens === contextTokens,
      `done.model_settings.context_window_tokens expected ${contextTokens}, got ${String(
        modelSettings?.context_window_tokens,
      )}`,
    )

    const messages = await requestJson<Message[]>(
      `${agentApiUrl}/api/conversations/${conversation.id}/messages`,
      { headers: authHeaders },
    )
    const assistant = [...messages].reverse().find((message) => message.role === 'assistant')
    assert(assistant, 'no persisted assistant message found')
    assert(
      assistant.metadata?.context_window_tokens === contextTokens,
      `assistant metadata context_window_tokens expected ${contextTokens}, got ${String(
        assistant.metadata?.context_window_tokens,
      )}`,
    )

    const baseline = await requestJson<{ context_breakdown?: Record<string, unknown> | null }>(
      `${agentApiUrl}/api/chat/conversations/${conversation.id}/context-baseline`,
      { headers: authHeaders },
    )
    const contextBreakdown = asRecord(baseline.context_breakdown)
    if (contextBreakdown) {
      assert(
        contextBreakdown.contextWindow === contextTokens,
        `context baseline window expected ${contextTokens}, got ${String(
          contextBreakdown.contextWindow,
        )}`,
      )
    }

    logPass(`selected context ${contextTokens} round-tripped through SSE and metadata`)
  } finally {
    await deleteConversation(authHeaders, conversation.id)
  }
}

async function createConversation(authHeaders: AuthHeaders, label: string): Promise<Conversation> {
  return requestJson<Conversation>(`${agentApiUrl}/api/conversations`, {
    method: 'POST',
    headers: jsonHeaders(authHeaders),
    body: JSON.stringify({
      title: `Smoke ${label} ${new Date().toISOString()}`,
      agent_id: 'vibey',
      metadata: {
        smoke_test: true,
        smoke_id: randomUUID(),
        smoke_label: label,
      },
    }),
  })
}

async function deleteConversation(authHeaders: AuthHeaders, conversationId: string): Promise<void> {
  const response = await fetch(`${agentApiUrl}/api/conversations/${conversationId}`, {
    method: 'DELETE',
    headers: authHeaders,
  })
  if (!response.ok && response.status !== 404) {
    const body = await response.text().catch(() => '')
    logWarn(`failed to delete smoke conversation ${conversationId}: ${response.status} ${body}`)
  }
}

async function requestJson<T>(url: string, init: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(url, init)
  } catch (error) {
    throw new Error(
      `request failed for ${url}: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
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

function parseCsvNumbers(value: string): number[] {
  return value
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item) && item > 0)
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '')
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function formatEventSummary(events: SmokeEvent[]): string {
  return events
    .map((event) => {
      const message =
        typeof event.message === 'string'
          ? event.message
          : typeof event.error === 'string'
            ? event.error
            : ''
      return message
        ? `${event.type ?? 'unknown'}(${message.slice(0, 180)})`
        : (event.type ?? 'unknown')
    })
    .join(', ')
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

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function logStep(message: string): void {
  console.log(`- ${message}`)
}

function logPass(message: string): void {
  console.log(`PASS ${message}`)
}

function logWarn(message: string): void {
  console.warn(`WARN ${message}`)
}

main().catch((error) => {
  console.error(`FAIL ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
