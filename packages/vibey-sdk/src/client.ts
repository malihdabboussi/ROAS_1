import type { StreamCallbacks, StreamPhase } from './types'

const DEFAULT_BASE_URL = 'http://localhost:3003'
const MAX_RETRIES = 3

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  retries = MAX_RETRIES,
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url, init)
    if (res.status !== 502 && res.status !== 503) return res
    if (attempt < retries) {
      await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt))
    }
  }
  return fetch(url, init)
}

interface ClientConfig {
  baseUrl: string
  sessionKey: string
  projectId: string
  internalToken: string
  userId: string
  orgId: string
}

function resolveConfig(): ClientConfig {
  return {
    baseUrl: process.env.VIBEY_API_URL || DEFAULT_BASE_URL,
    sessionKey: process.env.VIBEY_SESSION_KEY || '',
    projectId: process.env.VIBEY_PROJECT_ID || '',
    internalToken: process.env.VIBEY_INTERNAL_TOKEN || '',
    userId: process.env.VIBEY_USER_ID || '',
    orgId: process.env.VIBEY_ORG_ID || '',
  }
}

export async function artifactCall<T = Record<string, unknown>>(
  action: string,
  data: Record<string, unknown> = {},
): Promise<T> {
  const { baseUrl, sessionKey } = resolveConfig()
  const res = await fetchWithRetry(`${baseUrl}/api/artifacts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-openclaw-internal': 'true',
      ...(sessionKey ? { 'x-session-key': sessionKey } : {}),
    },
    body: JSON.stringify({ action, data }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Vibey API error ${res.status}: ${body.slice(0, 500)}`)
  }
  return res.json() as Promise<T>
}

export async function integrationCall<T = Record<string, unknown>>(
  service: string,
  integrationAction: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  return artifactCall<T>('use_integration', {
    service,
    integration_action: integrationAction,
    ...params,
  })
}

export interface AgentCallResult {
  success: boolean
  agent_key: string
  response: string
  usage: { input_tokens: number; output_tokens: number } | null
}

export async function agentCall(
  agentKey: string,
  message: string,
  context?: Record<string, unknown>,
): Promise<AgentCallResult> {
  const { baseUrl, sessionKey, projectId } = resolveConfig()
  if (!projectId) throw new Error('@vibey/sdk: VIBEY_PROJECT_ID is not set')
  const res = await fetchWithRetry(`${baseUrl}/api/apps/${projectId}/agent-call`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-vibey-session-key': sessionKey,
    },
    body: JSON.stringify({ agent_key: agentKey, message, context }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Vibey agent call failed (${res.status}): ${body.slice(0, 500)}`)
  }
  return res.json() as Promise<AgentCallResult>
}

function buildChatHeaders(): Record<string, string> {
  const { internalToken, userId, orgId } = resolveConfig()
  if (!internalToken) throw new Error('@vibey/sdk: VIBEY_INTERNAL_TOKEN is not set')
  if (!userId) throw new Error('@vibey/sdk: VIBEY_USER_ID is not set')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-internal-token': internalToken,
    'x-user-id': userId,
  }
  if (orgId) headers['x-org-id'] = orgId
  return headers
}

export async function chatFetch<T = unknown>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const { baseUrl } = resolveConfig()
  const res = await fetchWithRetry(`${baseUrl}${path}`, {
    method: options.method ?? 'GET',
    headers: buildChatHeaders(),
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Vibey chat API error ${res.status}: ${body.slice(0, 500)}`)
  }
  return res.json() as Promise<T>
}

const activeStreams = new Map<string, AbortController>()

export async function chatStream(
  conversationId: string,
  content: string,
  callbacks: StreamCallbacks,
): Promise<void> {
  const { baseUrl } = resolveConfig()
  const headers = buildChatHeaders()
  headers['Accept'] = 'text/event-stream'
  headers['Accept-Encoding'] = 'identity'

  const prev = activeStreams.get(conversationId)
  if (prev) prev.abort()
  const controller = new AbortController()
  activeStreams.set(conversationId, controller)

  try {
    const res = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ conversation_id: conversationId, content }),
      signal: controller.signal,
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      callbacks.onError?.(text || `Error ${res.status}`)
      return
    }

    const reader = res.body?.getReader()
    if (!reader) {
      callbacks.onError?.('No response body')
      return
    }

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.startsWith('data:')) continue
        const data = line.startsWith('data: ') ? line.slice(6).trim() : line.slice(5).trim()
        if (data === '[DONE]') continue

        try {
          const event = JSON.parse(data) as Record<string, unknown>
          switch (event.type as string) {
            case 'status':
              callbacks.onPhase?.(
                (event.phase as StreamPhase) ?? 'thinking',
                typeof event.message === 'string' ? event.message : undefined,
              )
              break
            case 'tool_start':
              callbacks.onToolStart?.(
                (event.name as string) ?? 'tool',
                (event.label as string) ?? 'Working...',
              )
              callbacks.onPhase?.('executing')
              break
            case 'tool_end':
              callbacks.onToolEnd?.(
                (event.name as string) ?? 'tool',
                (event.status as string) ?? 'completed',
              )
              break
            case 'content_delta':
              if (event.content) {
                callbacks.onContent?.(event.content as string)
                callbacks.onPhase?.('streaming')
              }
              break
            case 'error':
              callbacks.onError?.(
                (event.message as string) ?? (event.error as string) ?? 'Stream error',
              )
              break
            case 'done':
              callbacks.onDone?.()
              break
          }
        } catch {
          // skip malformed JSON
        }
      }
    }

    callbacks.onDone?.()
  } catch (err) {
    if ((err as Error).name !== 'AbortError') {
      callbacks.onError?.((err as Error).message ?? 'Stream failed')
    }
  } finally {
    activeStreams.delete(conversationId)
  }
}

export function chatStreamAbort(conversationId: string): void {
  const controller = activeStreams.get(conversationId)
  if (controller) {
    controller.abort()
    activeStreams.delete(conversationId)
  }
}
