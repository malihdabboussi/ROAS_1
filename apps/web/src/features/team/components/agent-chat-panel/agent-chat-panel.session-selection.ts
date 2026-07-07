import type { Message } from '@/lib/chat/studio-chat-runtime-adapter'
import {
  BACKEND_DEFAULT_MESSAGE_PAGE,
  INITIAL_PAGE_SIZE,
  MESSAGE_HYDRATION_TIMEOUT_MS,
  withTimeout,
} from './agent-chat-panel.logic'

interface FetchMessagesForSessionOptions {
  limit?: number
}

interface SelectSessionHydrationReport {
  had_cached_messages: boolean
  messages_count: number
}

export type SelectSessionHydrationStatus = 'applied' | 'stale' | 'stream-active'

export interface HydrateSelectedSessionMessagesInput {
  sessionId: string
  cachedMessages: Message[] | undefined
  loadToken: number
  getCurrentLoadToken: () => number
  fetchMessagesForSession: (
    sessionId: string,
    options?: FetchMessagesForSessionOptions,
  ) => Promise<Message[]>
  isStreamActiveForSession: (sessionId: string) => boolean
  mergeMessages: (localMessages: Message[], latestMessages: Message[]) => Message[]
  getLocalMessages: (sessionId: string) => Message[]
  setMessages: (sessionId: string, messages: Message[]) => void
  setHasOlder: (hasOlder: boolean) => void
  needsRecovery: (messages: Message[]) => boolean
  recover: (sessionId: string) => void
  reportEnd: (payload: SelectSessionHydrationReport) => void
}

export async function hydrateSelectedSessionMessages({
  sessionId,
  cachedMessages,
  loadToken,
  getCurrentLoadToken,
  fetchMessagesForSession,
  isStreamActiveForSession,
  mergeMessages,
  getLocalMessages,
  setMessages,
  setHasOlder,
  needsRecovery,
  recover,
  reportEnd,
}: HydrateSelectedSessionMessagesInput): Promise<SelectSessionHydrationStatus> {
  const hasCachedTargetMessages = (cachedMessages?.length ?? 0) > 0

  if (!hasCachedTargetMessages) {
    const latest = await withTimeout(
      fetchMessagesForSession(sessionId, { limit: INITIAL_PAGE_SIZE }),
      MESSAGE_HYDRATION_TIMEOUT_MS,
    )
    if (loadToken !== getCurrentLoadToken()) return 'stale'
    if (isStreamActiveForSession(sessionId)) return 'stream-active'

    setMessages(sessionId, latest)
    setHasOlder(latest.length === INITIAL_PAGE_SIZE)
    reportEnd({ had_cached_messages: false, messages_count: latest.length })
    if (needsRecovery(latest)) recover(sessionId)
    return 'applied'
  }

  if (needsRecovery(cachedMessages!)) recover(sessionId)

  const latest = await withTimeout(
    fetchMessagesForSession(sessionId),
    MESSAGE_HYDRATION_TIMEOUT_MS,
  )
  if (loadToken !== getCurrentLoadToken()) return 'stale'
  if (isStreamActiveForSession(sessionId)) return 'stream-active'

  const local = getLocalMessages(sessionId)
  setMessages(sessionId, mergeMessages(local, latest))
  setHasOlder(latest.length === BACKEND_DEFAULT_MESSAGE_PAGE)
  reportEnd({ had_cached_messages: true, messages_count: latest.length })
  return 'applied'
}
