import type { Conversation } from '@/lib/chat/studio-chat-runtime-adapter'

type InitialSessionSyncMarkContext = Record<string, string | number | boolean | null | undefined>

export type InitialSessionSyncStatus = 'found' | 'missed' | 'cancelled'

export interface RunAgentChatInitialSessionSyncRetryInput {
  agentKey: string
  initialSessionId: string
  knownSessionsCount: number
  fetchConversationsForAgent: (agentKey: string) => Promise<Conversation[]>
  setSessions: (sessions: Conversation[]) => void
  selectSession: (sessionId: string, hydrate: boolean) => Promise<void>
  reportMark: (phase: string, context?: InitialSessionSyncMarkContext) => void
  wait: (ms: number) => Promise<void>
  isCancelled: () => boolean
}

const INITIAL_SESSION_SYNC_ATTEMPTS = 3

export async function runAgentChatInitialSessionSyncRetry({
  agentKey,
  initialSessionId,
  knownSessionsCount,
  fetchConversationsForAgent,
  setSessions,
  selectSession,
  reportMark,
  wait,
  isCancelled,
}: RunAgentChatInitialSessionSyncRetryInput): Promise<InitialSessionSyncStatus> {
  reportMark('initial_session_sync_start', {
    known_sessions: knownSessionsCount,
  })

  for (let attempt = 0; attempt < INITIAL_SESSION_SYNC_ATTEMPTS; attempt += 1) {
    try {
      const latestSessions = await fetchConversationsForAgent(agentKey)
      if (isCancelled()) return 'cancelled'

      setSessions(latestSessions)
      if (latestSessions.some((session) => session.id === initialSessionId)) {
        reportMark('initial_session_sync_found', {
          attempt: attempt + 1,
          sessions_count: latestSessions.length,
        })
        await selectSession(initialSessionId, true)
        return 'found'
      }
    } catch (error: unknown) {
      reportMark('initial_session_sync_attempt_error', {
        attempt: attempt + 1,
        message: error instanceof Error ? error.message : String(error),
      })
    }

    if (attempt < INITIAL_SESSION_SYNC_ATTEMPTS - 1) {
      await wait(500 * (attempt + 1))
    }
  }

  reportMark('initial_session_sync_miss', {
    attempts: INITIAL_SESSION_SYNC_ATTEMPTS,
  })
  return 'missed'
}
