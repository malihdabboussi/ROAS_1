'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fetchAgentDocuments } from '@/lib/artifacts/artifact-preview-api'
import type { ConversationDocument } from '@/lib/artifacts/artifact-types'
import { fetchConversations, fetchMessages } from '@/lib/conversations/conversations-api'
import type { Conversation, Message } from '@/lib/conversations/conversation.types'
import {
  extractLinksFromText,
  extractMediaFromText,
  isArtifactDocumentType,
} from '../lib/chat-conversation-assets.utils'

const CONVERSATION_BATCH = 20
const MESSAGES_PER_CONV = 45

export interface AgentMediaLinkRow {
  id: string
  url: string
  title: string
  messageId: string
  role: 'user' | 'assistant'
  createdAt: string
}

export interface AgentMediaMediaRow {
  id: string
  kind: 'image' | 'video'
  url: string
  label?: string
  messageId: string
  role: 'user' | 'assistant'
  createdAt: string
}

function messagePlainText(message: Message): string {
  if (message.content && message.content.trim()) return message.content
  const blocks = message.content_blocks
  if (!blocks?.length) return ''
  return blocks
    .filter((b) => b.type === 'text')
    .map((b) => b.content)
    .join('\n')
}

export function useAgentMedia(agentKey: string | null) {
  const scopeGenRef = useRef(0)
  const [refreshKey, setRefreshKey] = useState(0)

  const [documents, setDocuments] = useState<ConversationDocument[]>([])
  const [docsLoading, setDocsLoading] = useState(false)
  const [docsError, setDocsError] = useState<string | null>(null)

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [convosLoading, setConvosLoading] = useState(false)

  const [messagesByConversation, setMessagesByConversation] = useState<Record<string, Message[]>>(
    {},
  )
  const [loadedConvCount, setLoadedConvCount] = useState(0)
  const [messagesLoading, setMessagesLoading] = useState(false)

  useEffect(() => {
    scopeGenRef.current += 1
    const g = scopeGenRef.current

    if (!agentKey) {
      setDocuments([])
      setDocsLoading(false)
      setDocsError(null)
      setConvosLoading(false)
      setConversations([])
      setMessagesByConversation({})
      setLoadedConvCount(0)
      return
    }

    setDocuments([])
    setDocsLoading(true)
    setDocsError(null)
    setConvosLoading(true)
    setConversations([])
    setMessagesByConversation({})
    setLoadedConvCount(0)
    ;(async () => {
      try {
        const [docs, convs] = await Promise.all([
          fetchAgentDocuments(agentKey),
          fetchConversations(undefined, agentKey),
        ])
        if (scopeGenRef.current !== g) return
        setDocuments(docs)
        setConversations(convs)
      } catch (e) {
        if (scopeGenRef.current !== g) return
        setDocuments([])
        setDocsError(e instanceof Error ? e.message : 'Failed to load documents')
      } finally {
        if (scopeGenRef.current === g) {
          setDocsLoading(false)
          setConvosLoading(false)
        }
      }
    })()
  }, [agentKey, refreshKey])

  const loadBatch = useCallback(
    async (startIdx: number) => {
      if (!agentKey || conversations.length === 0) return
      if (startIdx >= conversations.length) return
      const g = scopeGenRef.current

      const end = Math.min(startIdx + CONVERSATION_BATCH, conversations.length)
      const slice = conversations.slice(startIdx, end)

      setMessagesLoading(true)
      try {
        const pairs = await Promise.all(
          slice.map(async (c) => {
            const msgs = await fetchMessages(c.id, { limit: MESSAGES_PER_CONV })
            return [c.id, msgs] as const
          }),
        )
        if (scopeGenRef.current !== g) return
        setMessagesByConversation((prev) => {
          const next = { ...prev }
          for (const [id, msgs] of pairs) {
            next[id] = msgs
          }
          return next
        })
        setLoadedConvCount(end)
      } finally {
        if (scopeGenRef.current === g) {
          setMessagesLoading(false)
        }
      }
    },
    [agentKey, conversations],
  )

  useEffect(() => {
    if (!agentKey || conversations.length === 0) return
    if (loadedConvCount !== 0) return
    void loadBatch(0)
  }, [agentKey, conversations, loadedConvCount, loadBatch])

  const loadMore = useCallback(() => {
    if (messagesLoading) return
    if (loadedConvCount >= conversations.length) return
    void loadBatch(loadedConvCount)
  }, [messagesLoading, loadedConvCount, conversations.length, loadBatch])

  const { artifactDocs, fileDocs } = useMemo(() => {
    const artifacts: ConversationDocument[] = []
    const files: ConversationDocument[] = []
    for (const d of documents) {
      if (isArtifactDocumentType(d.document_type)) artifacts.push(d)
      else files.push(d)
    }
    return { artifactDocs: artifacts, fileDocs: files }
  }, [documents])

  const allLoadedMessages = useMemo(() => {
    const out: Message[] = []
    for (const c of conversations.slice(0, loadedConvCount)) {
      const chunk = messagesByConversation[c.id]
      if (chunk?.length) out.push(...chunk)
    }
    return out
  }, [conversations, loadedConvCount, messagesByConversation])

  const { mediaRows, linkRows } = useMemo(() => {
    const mediaMap = new Map<string, AgentMediaMediaRow>()
    const linkMap = new Map<string, AgentMediaLinkRow>()

    for (const msg of allLoadedMessages) {
      if (msg.role !== 'user' && msg.role !== 'assistant') continue
      const text = messagePlainText(msg)
      if (!text) continue

      const role = msg.role
      const createdAt = msg.created_at

      for (const m of extractMediaFromText(text)) {
        const id = `${msg.id}:${m.url}`
        if (!mediaMap.has(id)) {
          mediaMap.set(id, {
            id,
            kind: m.kind as 'image' | 'video',
            url: m.url,
            label: m.label,
            messageId: msg.id,
            role,
            createdAt,
          })
        }
      }

      for (const link of extractLinksFromText(text)) {
        const id = `${msg.id}:${link.url}`
        if (!linkMap.has(id)) {
          linkMap.set(id, {
            id,
            url: link.url,
            title: link.title,
            messageId: msg.id,
            role,
            createdAt,
          })
        }
      }
    }

    return {
      mediaRows: [...mediaMap.values()].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
      linkRows: [...linkMap.values()].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    }
  }, [allLoadedMessages])

  const hasMore = loadedConvCount < conversations.length

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1)
  }, [])

  return {
    docsLoading,
    docsError,
    artifactDocs,
    fileDocs,
    mediaRows,
    linkRows,
    loadMore,
    hasMore,
    messagesLoading,
    convosLoading,
    refresh,
  }
}
