import { getWebOrigin } from '../shared/config'
import { getActiveOrgId, getCachedOrRefreshSession } from './auth'

const PORT_NAME = 'vibey-chat-stream'

let activeChatReader: ReadableStreamDefaultReader<Uint8Array> | null = null

type PortMessage =
  | { action: 'start'; conversation_id: string; content: string; campaign_id?: string; model?: string }
  | { action: 'abort' }

function cancelActiveChatRead(): void {
  void activeChatReader?.cancel()
  activeChatReader = null
}

export function registerChatStreamPort(): void {
  chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== PORT_NAME) return

    port.onDisconnect.addListener(() => {
      cancelActiveChatRead()
    })

    port.onMessage.addListener((raw: unknown) => {
      const msg = raw as PortMessage
      if (!msg || typeof msg !== 'object') return
      if (msg.action === 'abort') {
        cancelActiveChatRead()
        return
      }
      if (msg.action !== 'start') return
      void runChatStream(port, msg.conversation_id, msg.content, msg.campaign_id, msg.model)
    })
  })
}

async function runChatStream(
  port: chrome.runtime.Port,
  conversationId: string,
  content: string,
  campaignId?: string,
  model?: string,
): Promise<void> {
  const session = await getCachedOrRefreshSession()
  if (!session) {
    port.postMessage({ action: 'error', message: 'Not signed in' })
    return
  }
  const orgId = await getActiveOrgId()
  const base = getWebOrigin().replace(/\/$/, '')
  const res = await fetch(`${base}/api/proxy/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.accessToken}`,
      'x-supabase-refresh-token': session.refreshToken,
      ...(orgId ? { 'x-org-id': orgId } : {}),
    },
    body: JSON.stringify({
      conversation_id: conversationId,
      content,
      ...(campaignId ? { campaign_id: campaignId } : {}),
      ...(typeof model === 'string' && model.trim().length > 0 ? { model: model.trim() } : {}),
    }),
  })

  if (!res.ok) {
    const t = await res.text()
    port.postMessage({ action: 'error', message: t || `HTTP ${res.status}` })
    return
  }

  const body = res.body
  if (!body) {
    port.postMessage({ action: 'error', message: 'No response body' })
    return
  }

  const r = body.getReader()
  activeChatReader = r
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await r.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      let sep: number
      while ((sep = buffer.indexOf('\n\n')) >= 0) {
        const block = buffer.slice(0, sep)
        buffer = buffer.slice(sep + 2)
        for (const line of block.split('\n')) {
          const trimmed = line.trimEnd()
          if (!trimmed || trimmed.startsWith(':')) continue
          if (!trimmed.startsWith('data: ')) continue
          const payload = trimmed.slice(6).trim()
          if (payload === '[DONE]') {
            port.postMessage({ action: 'done' })
            return
          }
          const parsed = JSON.parse(payload) as Record<string, unknown>
          port.postMessage({ action: 'event', event: parsed })
        }
      }
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    port.postMessage({ action: 'error', message })
    return
  } finally {
    if (activeChatReader === r) activeChatReader = null
  }

  port.postMessage({ action: 'done' })
}
