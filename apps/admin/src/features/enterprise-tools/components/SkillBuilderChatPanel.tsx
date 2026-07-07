'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { List, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { ChatInput } from '@web/features/studio/components/ChatInput'
import { MessageBubble } from '@web/features/studio/components/MessageBubble'
import { StatusIndicator } from '@web/features/studio/components/chat/StatusIndicator'
import { StreamInterruptedBar } from '@web/features/studio/components/chat/StreamInterruptedBar'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { useChatStore } from '@web/features/studio/store/use-chat-store'
import type { DocumentAttachment, Message } from '@web/features/studio/types'
import { SkillBuilderSessionsList } from './SkillBuilderSessionsList'
import { SkillBuilderChatProviders } from './SkillBuilderChatProviders'
import { createSkillBuilderSession, fetchSkillBuilderSessions } from '../services/skill-builder.service'
import {
  abortSkillBuilderStream,
  sendSkillBuilderMessageStreaming,
} from '../services/skill-builder-chat-stream.service'
import type {
  SkillBuilderAgent,
  SkillBuilderScope,
  SkillBuilderSession,
  SkillBuilderUser,
} from '../types/skill-builder.types'

type PanelMode = 'chat' | 'sessions'

const EMPTY_MESSAGES: Message[] = []

interface SkillBuilderChatPanelProps {
  selectedUser: SkillBuilderUser | null
  selectedScope: SkillBuilderScope | null
  selectedAgent: SkillBuilderAgent | null
  orgId: string | null
  session: SkillBuilderSession | null
  onSessionChange: (session: SkillBuilderSession | null) => void
  onSkillsChanged: () => void
}

function SkillBuilderChatPanelInner({
  selectedUser,
  selectedAgent,
  orgId,
  session,
  onSessionChange,
  onSkillsChanged,
}: SkillBuilderChatPanelProps) {
  const [mode, setMode] = useState<PanelMode>('chat')
  const [pastSessions, setPastSessions] = useState<SkillBuilderSession[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [composerRestore, setComposerRestore] = useState<{
    text: string
    documents?: DocumentAttachment[]
    nonce: string
  } | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  const sessionId = session?.id ?? null
  const messages = useChatStore((s) =>
    sessionId ? (s.messagesByConversation[sessionId] ?? EMPTY_MESSAGES) : EMPTY_MESSAGES,
  )
  const streamingMessageId = useChatStore((s) =>
    sessionId ? (s.streamingMessageIdsByConversation[sessionId] ?? null) : null,
  )
  const isStreaming = useChatStore((s) =>
    sessionId ? s.streamingConversationIds.includes(sessionId) : false,
  )
  const isStopping = useChatStore((s) =>
    sessionId ? s.stoppingConversationIds.includes(sessionId) : false,
  )

  useEffect(() => {
    if (!sessionId) {
      return
    }
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingMessageId, isStreaming, sessionId])

  const loadPastSessions = useCallback(async () => {
    setSessionsLoading(true)
    try {
      const data = await fetchSkillBuilderSessions()
      setPastSessions(data.sessions)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load sessions')
      setPastSessions([])
    } finally {
      setSessionsLoading(false)
    }
  }, [])

  const handleOpenSessions = useCallback(() => {
    setMode('sessions')
    void loadPastSessions()
  }, [loadPastSessions])

  const handleNewSession = useCallback(() => {
    if (sessionId) abortSkillBuilderStream(sessionId)
    onSessionChange(null)
    setMode('chat')
    setComposerRestore(null)
  }, [onSessionChange, sessionId])

  const ensureSession = useCallback(async (): Promise<SkillBuilderSession> => {
    if (session) return session
    if (!selectedUser || !selectedAgent) {
      throw new Error('Select a client and target agent first')
    }
    const created = await createSkillBuilderSession({
      acting_user_id: selectedUser.id,
      org_id: orgId,
      target_agent_key: selectedAgent.agent_key,
    })
    onSessionChange(created)
    useChatStore.getState().setMessages(created.id, [])
    return created
  }, [session, selectedUser, selectedAgent, orgId, onSessionChange])

  const handleSend = useCallback(
    async (content: string, documents?: DocumentAttachment[]) => {
      if (!selectedUser || !selectedAgent) return
      setComposerRestore(null)
      try {
        const activeSession = await ensureSession()
        await sendSkillBuilderMessageStreaming({
          sessionId: activeSession.id,
          content,
          documents,
        })
        onSkillsChanged()
      } catch (e) {
        setComposerRestore({ text: content, documents, nonce: crypto.randomUUID() })
        toast.error(e instanceof Error ? e.message : 'Chat failed')
      }
    },
    [selectedUser, selectedAgent, ensureSession, onSkillsChanged],
  )

  const handleStop = useCallback(() => {
    if (sessionId) abortSkillBuilderStream(sessionId)
  }, [sessionId])

  const handleSelectSession = useCallback(
    (picked: SkillBuilderSession) => {
      onSessionChange(picked)
      setMode('chat')
    },
    [onSessionChange],
  )

  const inputDisabled = !selectedUser || !selectedAgent

  const displayMessages = useMemo(
    () =>
      messages.filter(
        (m: Message) => m.role === 'user' || m.role === 'assistant',
      ),
    [messages],
  )

  return (
    <div
      className={`border-border flex min-h-[420px] flex-col overflow-hidden rounded-spacing-2 border ${
        mode === 'sessions' ? 'surface-bg' : 'surface-card'
      }`}
    >
      {mode === 'sessions' ? (
        <SkillBuilderSessionsList
          sessions={pastSessions}
          selectedSessionId={sessionId}
          loading={sessionsLoading}
          onSelectSession={handleSelectSession}
          onNewSession={handleNewSession}
          onBack={() => setMode('chat')}
        />
      ) : (
        <>
          <div className="border-border px-spacing-4 py-spacing-3 flex items-start justify-between gap-spacing-3 border-b">
            <div className="min-w-0">
              <h3 className="title-h4 text-foreground">Skill builder chat</h3>
              <p className="body-4 text-muted-foreground mt-spacing-1">
                Vibey + skill-creator · invisible to customer
              </p>
            </div>
            <div className="gap-spacing-0 flex shrink-0 items-center">
              <button
                type="button"
                onClick={handleNewSession}
                className="text-muted-foreground hover:text-foreground rounded-spacing-2 hover:bg-[var(--color-hover-subtle)] flex h-spacing-8 w-spacing-8 items-center justify-center transition-colors"
                aria-label="New session"
                title="New session"
              >
                <Plus className="icon-sm" />
              </button>
              <button
                type="button"
                onClick={handleOpenSessions}
                className="text-muted-foreground hover:text-foreground rounded-spacing-2 hover:bg-[var(--color-hover-subtle)] flex h-spacing-8 w-spacing-8 items-center justify-center transition-colors"
                aria-label="Past sessions"
                title="Past sessions"
              >
                <List className="icon-sm" />
              </button>
            </div>
          </div>

          <div className="gap-spacing-3 p-spacing-4 flex min-h-0 flex-1 flex-col overflow-y-auto">
            {displayMessages.length === 0 && !isStreaming ? (
              <p className="body-3 text-muted-foreground">
                Start a chat to build skills for the target agent.
              </p>
            ) : null}
            {displayMessages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isStreaming={msg.id === streamingMessageId}
                conversationIdOverride={sessionId}
                agentKey="vibey"
              />
            ))}
            {isStreaming ? (
              <div className="mt-spacing-1">
                <StatusIndicator conversationIdOverride={sessionId} />
              </div>
            ) : null}
            {isStreaming && displayMessages.length === 0 ? (
              <div className="body-3 text-muted-foreground flex items-center gap-spacing-2">
                <VibeyLoadingOrb state="processing" className="vibey-chat-orb--neutral" />
                Working…
              </div>
            ) : null}
            <div ref={messagesEndRef} />
          </div>

          <StreamInterruptedBar conversationId={sessionId} />

          <div className="border-border p-spacing-3 border-t">
            <ChatInput
              onSend={(content, documents) => void handleSend(content, documents)}
              disabled={inputDisabled || isStopping}
              isStreaming={isStreaming}
              onStop={handleStop}
              conversationId={sessionId}
              placeholder={
                inputDisabled
                  ? 'Select client and target agent…'
                  : 'Describe the skill to build… (@ to tag docs)'
              }
              initialValue={composerRestore?.text}
              initialDocuments={composerRestore?.documents}
              restoreNonce={composerRestore?.nonce}
              compact
              agentKey="vibey"
            />
          </div>
        </>
      )}
    </div>
  )
}

export function SkillBuilderChatPanel(props: SkillBuilderChatPanelProps) {
  return (
    <SkillBuilderChatProviders>
      <SkillBuilderChatPanelInner {...props} />
    </SkillBuilderChatProviders>
  )
}
