'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchConversationDocuments } from '@/lib/artifacts/artifact-preview-api'
import type { ConversationDocument } from '@/lib/artifacts/artifact-types'
import type { Message } from '@/lib/conversations/conversation.types'
import {
  extractLinksFromText,
  extractMediaFromText,
  isArtifactDocumentType,
} from '../lib/chat-conversation-assets.utils'

export interface ConversationLinkRow {
  id: string
  url: string
  title: string
  messageId: string
  role: 'user' | 'assistant'
  createdAt: string
}

export interface ConversationMediaRow {
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

export function useConversationMedia(conversationId: string | null, messages: Message[]) {
  const [documents, setDocuments] = useState<ConversationDocument[]>([])
  const [docsLoading, setDocsLoading] = useState(false)
  const [docsError, setDocsError] = useState<string | null>(null)

  const reloadDocuments = useCallback(async () => {
    if (!conversationId) {
      setDocuments([])
      return
    }
    setDocsLoading(true)
    setDocsError(null)
    try {
      const rows = await fetchConversationDocuments(conversationId)
      setDocuments(rows)
    } catch (e) {
      setDocuments([])
      setDocsError(e instanceof Error ? e.message : 'Failed to load documents')
    } finally {
      setDocsLoading(false)
    }
  }, [conversationId])

  useEffect(() => {
    void reloadDocuments()
  }, [reloadDocuments])

  const { artifactDocs, fileDocs } = useMemo(() => {
    const artifacts: ConversationDocument[] = []
    const files: ConversationDocument[] = []
    for (const d of documents) {
      if (isArtifactDocumentType(d.document_type)) artifacts.push(d)
      else files.push(d)
    }
    return { artifactDocs: artifacts, fileDocs: files }
  }, [documents])

  const { mediaRows, linkRows } = useMemo(() => {
    const mediaMap = new Map<string, ConversationMediaRow>()
    const linkMap = new Map<string, ConversationLinkRow>()

    for (const msg of messages) {
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
  }, [messages])

  return {
    documents,
    docsLoading,
    docsError,
    reloadDocuments,
    artifactDocs,
    fileDocs,
    mediaRows,
    linkRows,
  }
}
