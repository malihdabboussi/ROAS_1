import { buildPublicAgentApiUrl } from '@/lib/platform/platform-urls'

function getDevOverrides(): { apiBase: string; token: string } | null {
  if (typeof window === 'undefined' || window.location.hostname !== 'localhost') return null
  const params = new URLSearchParams(window.location.search)
  const apiBase = params.get('_apiBase')
  const token = params.get('_token')
  if (apiBase) return { apiBase, token: token || '' }
  return null
}

const buildApiUrl = (userSlug: string, agentKey: string, path: string) => {
  const dev = getDevOverrides()
  if (dev) return `${dev.apiBase}/api/public-${path}`
  return buildPublicAgentApiUrl(userSlug, agentKey, path)
}

function getDevHeaders(): Record<string, string> {
  const dev = getDevOverrides()
  if (dev?.token) return { 'x-public-agent-token': dev.token }
  return {}
}

export async function createPublicConversation(
  userSlug: string,
  agentKey: string,
  visitorId: string,
  identity?: { email?: string | null; first_name?: string | null; name?: string | null },
): Promise<{ id: string; created_at: string } | null> {
  const email = typeof identity?.email === 'string' ? identity.email.trim().toLowerCase() : ''
  const firstName =
    typeof identity?.first_name === 'string' && identity.first_name.trim()
      ? identity.first_name.trim()
      : ''
  const fallbackName = typeof identity?.name === 'string' ? identity.name.trim() : ''
  const res = await fetch(buildApiUrl(userSlug, agentKey, 'conversations'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getDevHeaders() },
    body: JSON.stringify({
      visitor_id: visitorId,
      ...(email ? { email } : {}),
      ...(firstName ? { first_name: firstName } : {}),
      ...(!firstName && fallbackName ? { name: fallbackName } : {}),
    }),
  })
  if (!res.ok) return null
  const json = await res.json()
  return json.conversation ?? null
}

export interface PublicConversationSummary {
  id: string
  title: string
  created_at: string
  updated_at: string
  last_preview: string
  last_activity_at: string
  contact_id: string | null
}

export async function listPublicConversations(
  userSlug: string,
  agentKey: string,
  visitorId: string,
  email?: string | null,
): Promise<PublicConversationSummary[]> {
  const params = new URLSearchParams({ visitor_id: visitorId })
  if (email && email.trim()) params.set('email', email.trim().toLowerCase())
  const res = await fetch(buildApiUrl(userSlug, agentKey, `conversations?${params.toString()}`), {
    headers: { ...getDevHeaders() },
  })
  if (!res.ok) return []
  const json = (await res.json()) as { conversations?: PublicConversationSummary[] }
  return json.conversations ?? []
}

export async function renamePublicConversation(
  userSlug: string,
  agentKey: string,
  conversationId: string,
  visitorId: string,
  title: string,
): Promise<boolean> {
  const res = await fetch(buildApiUrl(userSlug, agentKey, `conversations/${conversationId}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getDevHeaders() },
    body: JSON.stringify({ visitor_id: visitorId, title }),
  })
  if (!res.ok) return false
  const json = (await res.json()) as { ok?: boolean }
  return !!json.ok
}

export async function fetchPublicMessages(
  userSlug: string,
  agentKey: string,
  conversationId: string,
): Promise<
  Array<{ id: string; role: string; content: string; metadata: unknown; created_at: string }>
> {
  const res = await fetch(
    buildApiUrl(userSlug, agentKey, `conversations/${conversationId}/messages`),
    { headers: { ...getDevHeaders() } },
  )
  if (!res.ok) return []
  const json = await res.json()
  return json.messages ?? []
}

function readPublicAgentSseLine(line: string, onEvent: (event: Record<string, unknown>) => void) {
  if (!line.startsWith('data: ')) return
  const payload = line.slice(6)
  if (payload === '[DONE]') return
  try {
    const parsed = JSON.parse(payload)
    onEvent(parsed)
  } catch {
    // skip malformed lines
  }
}

export function flushPublicAgentSseBuffer(
  buffer: string,
  onEvent: (event: Record<string, unknown>) => void,
): string {
  const lines = buffer.split('\n')
  const remaining = lines.pop() ?? ''
  for (const line of lines) readPublicAgentSseLine(line, onEvent)
  return remaining
}

export function sendPublicMessageStream(
  userSlug: string,
  agentKey: string,
  body: { visitor_id: string; conversation_id: string; content: string },
  onEvent: (event: Record<string, unknown>) => void,
  signal?: AbortSignal,
): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      const res = await fetch(buildApiUrl(userSlug, agentKey, 'chat'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
          ...getDevHeaders(),
        },
        body: JSON.stringify(body),
        signal,
      })
      if (!res.ok || !res.body) {
        reject(new Error(`Chat request failed: ${res.status}`))
        return
      }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        buffer = flushPublicAgentSseBuffer(buffer, onEvent)
      }
      buffer += decoder.decode()
      if (buffer) flushPublicAgentSseBuffer(`${buffer}\n`, onEvent)
      resolve()
    } catch (err) {
      if (signal?.aborted) resolve()
      else reject(err)
    }
  })
}

export async function prewarmPublicConversation(
  userSlug: string,
  agentKey: string,
  body: { visitor_id: string; conversation_id: string },
): Promise<boolean> {
  const res = await fetch(buildApiUrl(userSlug, agentKey, 'chat/prewarm'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getDevHeaders() },
    body: JSON.stringify(body),
  })
  return res.ok
}

export async function prewarmPublicAgent(
  userSlug: string,
  agentKey: string,
  body: { visitor_id?: string },
): Promise<boolean> {
  const res = await fetch(buildApiUrl(userSlug, agentKey, 'chat/prewarm-agent'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getDevHeaders() },
    body: JSON.stringify(body),
  })
  return res.ok
}

export async function identifyPublicVisitor(
  userSlug: string,
  agentKey: string,
  payload: {
    visitor_id: string
    conversation_id: string
    email: string
    first_name?: string
    name?: string
  },
): Promise<{ linked: boolean; contact_id?: string } | null> {
  const res = await fetch(buildApiUrl(userSlug, agentKey, 'chat/identify'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getDevHeaders() },
    body: JSON.stringify(payload),
  })
  if (!res.ok) return null
  return res.json() as Promise<{ linked: boolean; contact_id?: string }>
}

export interface WidgetHomeConfig {
  heroText?: string
  ctaCards?: Array<{ id: string; title: string; body: string; imageUrl?: string; linkUrl?: string }>
  showRecentMessage?: boolean
}

export interface WidgetHelpArticle {
  id: string
  collection?: string
  title: string
  content: string
  order: number
}

export interface WidgetHelpCollection {
  id: string
  name: string
  order: number
}

export interface WidgetNewsItem {
  id: string
  title: string
  body: string
  imageUrl?: string
  linkUrl?: string
  publishedAt?: string
}

export interface WidgetConfigResponse {
  name: string
  role: string
  imageUrl: string | null
  title: string
  subtitle: string | null
  showSubtitle?: boolean
  greeting: string | null
  accentColor: string
  launcherIconUrl: string | null
  position: 'bottom-right' | 'bottom-left'
  allowedOrigins: string[]
  userSlug: string | null
  userId?: string
  agentKey: string
  homeConfig?: WidgetHomeConfig
  helpArticles?: WidgetHelpArticle[]
  helpCollections?: WidgetHelpCollection[]
  newsItems?: WidgetNewsItem[]
}

export async function fetchPublicWidgetConfig(
  userSlug: string,
  agentKey: string,
): Promise<WidgetConfigResponse | null> {
  const res = await fetch(buildApiUrl(userSlug, agentKey, 'widget/config'), {
    headers: { ...getDevHeaders() },
  })
  if (!res.ok) return null
  const json = (await res.json()) as { ok?: boolean; config?: WidgetConfigResponse }
  if (!json.ok || !json.config) return null
  return json.config
}

export async function createPublicVoiceSession(
  userSlug: string,
  agentKey: string,
  body: { conversationId?: string; voiceName?: string },
): Promise<{ sessionId: string; wsUrl: string | null; userId: string } | null> {
  const res = await fetch(buildApiUrl(userSlug, agentKey, 'brain/live-session'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getDevHeaders() },
    body: JSON.stringify({
      scope: {
        type: 'agent',
        agentId: agentKey,
        conversationId: body.conversationId,
        voiceName: body.voiceName,
      },
      conversationId: body.conversationId,
      voiceName: body.voiceName,
    }),
  })
  if (!res.ok) return null
  return res.json()
}
