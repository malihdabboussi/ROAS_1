import { randomUUID } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

type AuthHeaders = Record<string, string>
type SmokeEvent = Record<string, unknown> & { type?: string }

interface Conversation {
  id: string
}

interface ChatSmokeResult {
  index: number
  ok: boolean
  conversationId?: string
  httpStatus?: number
  acceptedMs?: number
  firstEventMs?: number
  totalMs: number
  eventTypes?: string[]
  error?: string
}

const repoRoot = resolve(__dirname, '../..')
for (const envFile of [
  resolve(repoRoot, 'apps/api/.env'),
  resolve(repoRoot, 'apps/agent-api/.env'),
  resolve(repoRoot, 'apps/web/.env'),
]) {
  if (existsSync(envFile)) loadEnvFile(envFile)
}

const agentApiUrl = trimTrailingSlash(
  process.env.VIBEY_SMOKE_AGENT_API_URL ||
    process.env.AGENT_API_URL ||
    'https://vibeyv2-production-1437.up.railway.app',
)
const orgId = process.env.VIBEY_SMOKE_ORG_ID?.trim() || null
const chatCount = readPositiveInt(process.env.VIBEY_SMOKE_CHAT_COUNT, 8)
const modelId = process.env.VIBEY_SMOKE_MODEL_ID || 'openai/gpt-5.5'

async function main(): Promise<void> {
  const auth = await resolveAuthHeaders()
  console.log(`agent=${agentApiUrl}`)
  console.log(`org=${orgId || '-'}`)
  console.log(`model=${modelId}`)
  console.log(`chat_count=${chatCount}`)
  console.log('')

  await assertAgentReachable()

  const wallStart = Date.now()
  const results = await Promise.all(
    Array.from({ length: chatCount }, (_, index) => runChat(auth, index + 1)),
  )
  printReport(results, Date.now() - wallStart)

  if (results.some((result) => !result.ok)) process.exit(1)
}

async function runChat(auth: AuthHeaders, index: number): Promise<ChatSmokeResult> {
  const startedAt = Date.now()
  let conversationId = ''
  try {
    const conversation = await createConversation(auth, index)
    conversationId = conversation.id

    const responseStartedAt = Date.now()
    const response = await fetch(`${agentApiUrl}/api/chat`, {
      method: 'POST',
      headers: jsonHeaders(auth),
      body: JSON.stringify({
        conversation_id: conversation.id,
        content: `Railway autoscale smoke ${index}. Reply with exactly: PONG-${index}`,
        model: modelId,
        model_settings: {
          context_window_tokens: 272000,
          reasoning_effort: 'none',
          speed_mode: 'standard',
        },
        system_context: `Automated smoke test. Reply exactly PONG-${index}.`,
      }),
    })

    const acceptedAt = Date.now()
    const events = await readSseEvents(response)
    const eventTypes = events.map((event) => String(event.type ?? 'unknown'))
    const errorEvent = events.find((event) => event.type === 'error')
    const doneEvent = events.find((event) => event.type === 'done')
    const firstContentEvent = events.find((event) =>
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

    if (!response.ok && response.status !== 201) {
      throw new Error(`chat HTTP ${response.status}: ${eventTypes.join(', ')}`)
    }
    if (errorEvent) {
      throw new Error(`chat error event: ${JSON.stringify(errorEvent)}`)
    }
    if (!doneEvent) {
      throw new Error(`chat missing done event: ${eventTypes.join(', ')}`)
    }

    return {
      index,
      ok: true,
      conversationId,
      httpStatus: response.status,
      acceptedMs: acceptedAt - responseStartedAt,
      firstEventMs: firstContentEvent ? acceptedAt - responseStartedAt : undefined,
      totalMs: Date.now() - startedAt,
      eventTypes,
    }
  } catch (error) {
    return {
      index,
      ok: false,
      conversationId: conversationId || undefined,
      totalMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    }
  } finally {
    if (conversationId) {
      await deleteConversation(auth, conversationId)
    }
  }
}

async function createConversation(auth: AuthHeaders, index: number): Promise<Conversation> {
  return requestJson<Conversation>(`${agentApiUrl}/api/conversations`, {
    method: 'POST',
    headers: jsonHeaders(auth),
    body: JSON.stringify({
      title: `Railway autoscale smoke ${index} ${new Date().toISOString()}`,
      agent_id: 'vibey',
      metadata: {
        smoke_test: true,
        smoke_id: randomUUID(),
        smoke_kind: 'railway-chat-autoscale',
        smoke_index: index,
      },
    }),
  })
}

async function deleteConversation(auth: AuthHeaders, conversationId: string): Promise<void> {
  const response = await fetch(`${agentApiUrl}/api/conversations/${conversationId}`, {
    method: 'DELETE',
    headers: auth,
  })
  if (!response.ok && response.status !== 404) {
    const text = await response.text().catch(() => '')
    console.warn(`cleanup_failed conversation=${conversationId} status=${response.status} ${text}`)
  }
}

async function assertAgentReachable(): Promise<void> {
  const response = await fetch(`${agentApiUrl}/api/health`)
  if (!response.ok) {
    throw new Error(`Agent API health failed status=${response.status}: ${await response.text()}`)
  }
}

async function resolveAuthHeaders(): Promise<AuthHeaders> {
  const explicitToken = process.env.VIBEY_SMOKE_ACCESS_TOKEN?.trim()
  if (explicitToken) return withOrgHeader({ Authorization: `Bearer ${explicitToken}` })

  const email = process.env.VIBEY_SMOKE_EMAIL?.trim()
  const password = process.env.VIBEY_SMOKE_PASSWORD?.trim()
  const supabaseUrl =
    process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const anonKey =
    process.env.SUPABASE_ANON_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

  if (email && password && supabaseUrl && anonKey) {
    const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: anonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const text = await response.text()
    if (!response.ok) throw new Error(`Supabase smoke sign-in failed: ${text}`)
    const session = JSON.parse(text) as { access_token?: string; refresh_token?: string }
    if (!session.access_token) throw new Error('Supabase smoke sign-in missing access_token')
    return withOrgHeader({
      Authorization: `Bearer ${session.access_token}`,
      ...(session.refresh_token ? { 'x-supabase-refresh-token': session.refresh_token } : {}),
    })
  }

  throw new Error(
    [
      'Missing smoke auth.',
      'Set VIBEY_SMOKE_ACCESS_TOKEN or',
      'VIBEY_SMOKE_EMAIL + VIBEY_SMOKE_PASSWORD + SUPABASE_URL + SUPABASE_ANON_KEY.',
    ].join(' '),
  )
}

async function requestJson<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, init)
  const text = await response.text()
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}: ${text}`)
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

function withOrgHeader(headers: AuthHeaders): AuthHeaders {
  return orgId ? { ...headers, 'x-org-id': orgId } : headers
}

function jsonHeaders(headers: AuthHeaders): AuthHeaders {
  return { ...headers, 'Content-Type': 'application/json' }
}

function printReport(results: ChatSmokeResult[], wallMs: number): void {
  console.log(
    pad('chat', 8),
    pad('ok', 4),
    pad('http', 6),
    pad('accept', 9),
    pad('first', 9),
    pad('total', 9),
    'events/error',
  )
  for (const result of results) {
    console.log(
      pad(String(result.index), 8),
      pad(result.ok ? 'yes' : 'no', 4),
      pad(String(result.httpStatus ?? '-'), 6),
      pad(ms(result.acceptedMs), 9),
      pad(ms(result.firstEventMs), 9),
      pad(ms(result.totalMs), 9),
      result.error ?? result.eventTypes?.join(',') ?? '-',
    )
  }
  console.log('')
  console.log(`wall_clock_parallel_ms=${wallMs}`)
  console.log(`passed=${results.filter((result) => result.ok).length}/${results.length}`)
}

function pad(value: string, width: number): string {
  return value.padEnd(width)
}

function ms(value: number | undefined): string {
  return value == null ? '-' : `${value}ms`
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '')
}

function readPositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value || '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
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
    process.env[key] = unquoteEnvValue(line.slice(equalsIndex + 1).trim())
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

main().catch((error) => {
  console.error(`FAIL ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
