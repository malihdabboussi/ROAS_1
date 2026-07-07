import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import type { Conversation } from '@/lib/chat/studio-chat-runtime-adapter'
import { TEAM_DRAFT_IDLE_TTL_MS } from './agent-chat-panel.logic'

interface SessionTitleTypewriter {
  conversationId: string
  text: string
}

export interface UseAgentChatSessionLifecycleInput {
  sessions: Conversation[]
  selectedSessionId: string | null
  fetchMessagesForSession: (
    conversationId: string,
    options?: { limit?: number },
  ) => Promise<unknown[]>
  deleteConversationById: (conversationId: string) => Promise<void>
  removeConversation: (conversationId: string) => void
  setSessions: Dispatch<SetStateAction<Conversation[]>>
  setSelectedSessionId: (sessionId: string | null) => void
  setActiveConversationId: (sessionId: string | null) => void
  selectSession: (sessionId: string, hydrate: boolean) => Promise<void>
  renameConversationById: (conversationId: string, title: string) => Promise<void>
  updateConversation: (conversationId: string, updates: Partial<Conversation>) => void
  getConversation: (conversationId: string) => Conversation | undefined
  onConversationUpdated?: (conversation: Conversation) => void
}

export function useAgentChatSessionLifecycle({
  sessions,
  selectedSessionId,
  fetchMessagesForSession,
  deleteConversationById,
  removeConversation,
  setSessions,
  setSelectedSessionId,
  setActiveConversationId,
  selectSession,
  renameConversationById,
  updateConversation,
  getConversation,
  onConversationUpdated,
}: UseAgentChatSessionLifecycleInput) {
  const [sessionTitleTypewriter, setSessionTitleTypewriter] =
    useState<SessionTitleTypewriter | null>(null)
  const sessionTitleRevealTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const draftCleanupTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const sessionsRef = useRef<Conversation[]>(sessions)
  const selectedSessionIdRef = useRef<string | null>(selectedSessionId)

  useEffect(() => {
    sessionsRef.current = sessions
  }, [sessions])

  useEffect(() => {
    selectedSessionIdRef.current = selectedSessionId
  }, [selectedSessionId])

  useEffect(() => {
    return () => {
      if (sessionTitleRevealTimerRef.current) {
        clearInterval(sessionTitleRevealTimerRef.current)
        sessionTitleRevealTimerRef.current = null
      }
    }
  }, [])

  const cancelTeamDraftTimer = useCallback((conversationId: string) => {
    const timer = draftCleanupTimersRef.current.get(conversationId)
    if (timer) clearTimeout(timer)
    draftCleanupTimersRef.current.delete(conversationId)
  }, [])

  const clearSessionTitleReveal = useCallback((conversationId: string) => {
    setSessionTitleTypewriter((prev) => {
      if (prev?.conversationId !== conversationId) return prev
      if (sessionTitleRevealTimerRef.current) {
        clearInterval(sessionTitleRevealTimerRef.current)
        sessionTitleRevealTimerRef.current = null
      }
      return null
    })
  }, [])

  const scheduleTeamDraftTimer = useCallback(
    (conversationId: string, draftStartedAt: string) => {
      cancelTeamDraftTimer(conversationId)

      const started = Date.parse(draftStartedAt)
      if (!Number.isFinite(started)) return

      const fire = () => {
        draftCleanupTimersRef.current.delete(conversationId)
        void (async () => {
          const row = sessionsRef.current.find((session) => session.id === conversationId)
          const meta = row?.metadata as Record<string, unknown> | undefined
          if (meta?.team_draft !== true) return

          const messages = await fetchMessagesForSession(conversationId, { limit: 1 })
          if (messages.length > 0) return

          await deleteConversationById(conversationId)
          removeConversation(conversationId)

          clearSessionTitleReveal(conversationId)

          let nextSessions: Conversation[] = []
          setSessions((prev) => {
            nextSessions = prev.filter((session) => session.id !== conversationId)
            return nextSessions
          })

          if (selectedSessionIdRef.current === conversationId) {
            if (nextSessions[0]) {
              await selectSession(nextSessions[0].id, true)
            } else {
              setSelectedSessionId(null)
              setActiveConversationId(null)
            }
          }
        })()
      }

      const elapsed = Date.now() - started
      const remaining = TEAM_DRAFT_IDLE_TTL_MS - elapsed
      if (remaining <= 0) fire()
      else draftCleanupTimersRef.current.set(conversationId, setTimeout(fire, remaining))
    },
    [
      cancelTeamDraftTimer,
      clearSessionTitleReveal,
      deleteConversationById,
      fetchMessagesForSession,
      removeConversation,
      selectSession,
      setActiveConversationId,
      setSelectedSessionId,
      setSessions,
    ],
  )

  useEffect(() => {
    const draftIds = new Set(
      sessions
        .filter(
          (session) =>
            (session.metadata as Record<string, unknown> | undefined)?.team_draft === true,
        )
        .map((session) => session.id),
    )

    for (const id of Array.from(draftCleanupTimersRef.current.keys())) {
      if (!draftIds.has(id)) cancelTeamDraftTimer(id)
    }
    for (const session of sessions) {
      const meta = session.metadata as Record<string, unknown> | undefined
      if (meta?.team_draft !== true) continue
      const started = meta.draft_started_at
      if (typeof started !== 'string') continue
      if (!draftCleanupTimersRef.current.has(session.id)) {
        scheduleTeamDraftTimer(session.id, started)
      }
    }
  }, [sessions, scheduleTeamDraftTimer, cancelTeamDraftTimer])

  useEffect(() => {
    return () => {
      for (const timer of draftCleanupTimersRef.current.values()) clearTimeout(timer)
      draftCleanupTimersRef.current.clear()
    }
  }, [])

  const beginSessionTitleReveal = useCallback(
    (conversationId: string, fullTitle: string) => {
      if (!fullTitle) return
      if (sessionTitleRevealTimerRef.current) {
        clearInterval(sessionTitleRevealTimerRef.current)
        sessionTitleRevealTimerRef.current = null
      }
      setSessionTitleTypewriter({ conversationId, text: '' })
      let index = 0
      sessionTitleRevealTimerRef.current = setInterval(() => {
        index += 1
        const next = fullTitle.slice(0, index)
        setSessionTitleTypewriter({ conversationId, text: next })
        if (index >= fullTitle.length) {
          if (sessionTitleRevealTimerRef.current) {
            clearInterval(sessionTitleRevealTimerRef.current)
            sessionTitleRevealTimerRef.current = null
          }
          void renameConversationById(conversationId, fullTitle).then(() => {
            setSessions((prev) =>
              prev.map((session) =>
                session.id === conversationId ? { ...session, title: fullTitle } : session,
              ),
            )
            updateConversation(conversationId, { title: fullTitle })
            const updated =
              getConversation(conversationId) ??
              ({ id: conversationId, title: fullTitle } as Conversation)
            onConversationUpdated?.({ ...updated, title: fullTitle })
            setSessionTitleTypewriter(null)
          })
        }
      }, 36)
    },
    [
      getConversation,
      onConversationUpdated,
      renameConversationById,
      setSessions,
      updateConversation,
    ],
  )

  return {
    sessionTitleTypewriter,
    cancelTeamDraftTimer,
    clearSessionTitleReveal,
    beginSessionTitleReveal,
  }
}
