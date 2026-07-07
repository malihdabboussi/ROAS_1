'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  createNewConversation,
  fetchConversations,
  fetchMessages,
  recoverConversation,
  sendMessageStreaming,
  type ChatModelSettings,
} from '@/features/studio/services/chat.service'
import { useChatStore } from '@/features/studio/store/use-chat-store'
import type { DocumentAttachment, HighlightedArtifact, Message } from '@/features/studio/types'

const EMPTY_MESSAGES: Message[] = []

interface UseProjectChatOptions {
  projectId: string
  projectName: string
  conversationId: string | null
  agentKey?: string
  open: boolean
}

interface UseProjectChatReturn {
  conversationId: string | null
  messages: Message[]
  isStreaming: boolean
  agentPhase: string
  sendMessage: (
    content: string,
    documents?: DocumentAttachment[],
    artifacts?: Array<{ id: string; type: string; label: string }>,
    model?: string,
    modelSettings?: ChatModelSettings,
  ) => Promise<void>
  ready: boolean
}

function buildProjectContext(projectId: string, projectName: string): string {
  return [
    `[Project Context]`,
    `project_id: ${projectId}`,
    `project_name: ${projectName}`,
    `This is a real Next.js application running on the user's VM.`,
    `Use create_file / update_file / read_file / list_project_files / update_project_deps / get_project_logs with this project_id.`,
    `Import @vibey/sdk for real data: team, integrations (YouTube, Instagram, Meta, etc.), campaigns, brain.`,
    `The app uses Next.js App Router. Entry point is app/page.tsx. Layout is app/layout.tsx.`,
    `Creating package.json auto-triggers npm install + dev server start. Every file write hot-reloads instantly.`,
    `Never use mock/fake data — the SDK connects to the user's real accounts and platform data.`,
    ``,
    `[Agent Integration — vibey.agent()]`,
    `The app can call any team member agent for AI tasks using @vibey/sdk:`,
    `  import { vibey } from '@vibey/sdk'`,
    `  const result = await vibey.agent('rex').ask('Analyze this code for bugs', { code })`,
    `  // result.response = agent's text response, result.agent_key = who answered`,
    `Use vibey.team.list() to discover available agents and their roles.`,
    `Pick the right agent for the task: Rex for code review, Sage for strategy, Aria for copywriting, etc.`,
    `The agent runs server-side (API route or server action) — never expose the call in client components.`,
    `Auth is automatic via VIBEY_SESSION_KEY environment variable.`,
  ].join('\n')
}

export function useProjectChat({
  projectId,
  projectName,
  conversationId: initialConversationId,
  agentKey = 'vibey',
  open,
}: UseProjectChatOptions): UseProjectChatReturn {
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId)
  const [ready, setReady] = useState(false)
  const initInFlightRef = useRef(false)
  const initDoneRef = useRef(false)
  const resumedRef = useRef<Set<string>>(new Set())
  const contextSentRef = useRef<Set<string>>(new Set())

  const messagesByConversation = useChatStore((s) => s.messagesByConversation)
  const messages = useMemo(() => {
    if (!conversationId) return EMPTY_MESSAGES
    return messagesByConversation[conversationId] ?? EMPTY_MESSAGES
  }, [conversationId, messagesByConversation])

  const streamingConversationIds = useChatStore((s) => s.streamingConversationIds)
  const isStreaming = conversationId ? streamingConversationIds.includes(conversationId) : false
  const agentPhase = useChatStore((s) => s.agentPhase)

  useEffect(() => {
    if (!open) return
    if (initInFlightRef.current || initDoneRef.current) return
    const init = async () => {
      initInFlightRef.current = true
      try {
        let cid = initialConversationId
        if (!cid) {
          const storageKey = `vibey:project-chat:${projectId}:${agentKey}`
          const stored =
            typeof window !== 'undefined' ? window.localStorage.getItem(storageKey) : null
          if (stored && stored.trim()) {
            cid = stored
          } else {
            const conv = await createNewConversation({
              title: `Project: ${projectName}`,
              agent_id: agentKey,
            })
            cid = conv.id
            if (typeof window !== 'undefined') {
              window.localStorage.setItem(storageKey, cid)
            }
          }
        }
        if (cid) {
          const conversations = await fetchConversations()
          const matched = conversations.find((c) => c.id === cid) ?? null
          const currentAgent = matched?.agent_id ?? null
          if (currentAgent !== agentKey) {
            const conv = await createNewConversation({
              title: `Project: ${projectName}`,
              agent_id: agentKey,
            })
            cid = conv.id
            const storageKey = `vibey:project-chat:${projectId}:${agentKey}`
            if (typeof window !== 'undefined') {
              window.localStorage.setItem(storageKey, cid)
            }
          }
        }
        setConversationId(cid)
        const msgs = await fetchMessages(cid)
        useChatStore.getState().setMessages(cid, msgs)
        if (msgs.length > 0) contextSentRef.current.add(cid)
        setReady(true)
        initDoneRef.current = true
      } finally {
        initInFlightRef.current = false
      }
    }
    void init()
  }, [open, projectId, projectName, initialConversationId, agentKey])

  useEffect(() => {
    if (!open || !conversationId) return
    if (resumedRef.current.has(conversationId)) return
    resumedRef.current.add(conversationId)
    void recoverConversation(conversationId)
  }, [conversationId, open])

  useEffect(() => {
    if (!open || !conversationId) return
    let cancelled = false
    const ensureExpectedAgent = async () => {
      try {
        const conversations = await fetchConversations()
        const matched = conversations.find((c) => c.id === conversationId) ?? null
        const currentAgent = matched?.agent_id ?? null
        if (currentAgent === agentKey || cancelled) return
        const conv = await createNewConversation({
          title: `Project: ${projectName}`,
          agent_id: agentKey,
        })
        if (cancelled) return
        setConversationId(conv.id)
        const storageKey = `vibey:project-chat:${projectId}:${agentKey}`
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(storageKey, conv.id)
        }
      } catch {
        // non-blocking guard
      }
    }
    void ensureExpectedAgent()
    return () => {
      cancelled = true
    }
  }, [open, conversationId, agentKey, projectId, projectName])

  const sendMessage = useCallback(
    async (
      content: string,
      documents?: DocumentAttachment[],
      artifacts?: Array<{ id: string; type: string; label: string }>,
      model?: string,
      modelSettings?: ChatModelSettings,
    ) => {
      if (!conversationId || !content.trim()) return

      const needsContext = !contextSentRef.current.has(conversationId)
      if (needsContext) contextSentRef.current.add(conversationId)
      useChatStore.getState().promoteConversation(conversationId)

      const highlighted_artifacts: HighlightedArtifact[] | undefined = artifacts?.map((a) => ({
        id: a.id,
        type: a.type,
        label: a.label,
      }))
      await sendMessageStreaming({
        conversation_id: conversationId,
        content,
        documents,
        highlighted_artifacts,
        model,
        model_settings: modelSettings,
        system_context: needsContext ? buildProjectContext(projectId, projectName) : undefined,
      })
    },
    [conversationId, projectId, projectName],
  )

  return {
    conversationId,
    messages,
    isStreaming,
    agentPhase,
    sendMessage,
    ready,
  }
}
