'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Boxes,
  ExternalLink,
  FileText,
  ImageIcon,
  LocateFixed,
  MoreHorizontal,
  Rocket,
  Video,
} from 'lucide-react'
import {
  fetchConversationDocuments,
  openArtifactInShell,
  type ConversationDocument,
} from '@/lib/artifacts'
import { isArtifactDocumentType, type Message } from '@/lib/conversations'
import type { DeliverableType } from '@/lib/missions'
import { cn } from '@/lib/utils/cn'
import { showConversationMessageInChat } from './shell-chat-message-navigation'
import { extractConversationFileRows, type ConversationFileRow } from './shell-conversation-summary'
import { SHELL_RIGHT_PANEL_MESSAGES } from './shell-right-panel.messages.config'

function documentFileUrl(document: ConversationDocument): string | null {
  const value = document.content?.file_url
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function documentTargetType(document: ConversationDocument): DeliverableType {
  if (isArtifactDocumentType(document.document_type) && document.resource_id) {
    return document.document_type
  }
  if (document.document_type === 'image_upload') return 'image'
  return document.document_type === 'pdf' ? 'pdf' : 'file'
}

function messageTargetType(row: ConversationFileRow): DeliverableType {
  if (row.kind === 'artifact') return (row.entityType as DeliverableType | null) ?? 'file'
  return row.kind
}

export function ShellRightPanelFiles({
  conversationId,
  messages,
}: {
  conversationId: string
  messages: Message[]
}) {
  const [documents, setDocuments] = useState<ConversationDocument[]>([])
  const [loading, setLoading] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)
  const [activeMenuRowId, setActiveMenuRowId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const messageRows = useMemo(() => extractConversationFileRows(messages), [messages])

  useEffect(() => {
    setDocuments([])
    setLoadFailed(false)
    if (conversationId.startsWith('pending-')) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    void fetchConversationDocuments(conversationId)
      .then((rows) => {
        if (!cancelled) setDocuments(rows)
      })
      .catch(() => {
        if (!cancelled) {
          setDocuments([])
          setLoadFailed(true)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [conversationId])

  useEffect(() => {
    if (!activeMenuRowId) return
    const handleOutside = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setActiveMenuRowId(null)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [activeMenuRowId])

  const empty = !loading && documents.length === 0 && messageRows.length === 0

  return (
    <div className="space-y-spacing-3">
      {loading ? (
        <p className="body-3 text-muted-foreground">
          {SHELL_RIGHT_PANEL_MESSAGES.chatFilesLoading}
        </p>
      ) : null}
      {loadFailed ? (
        <p className="body-3 text-destructive">{SHELL_RIGHT_PANEL_MESSAGES.chatFilesError}</p>
      ) : null}
      {empty ? (
        <p className="body-3 text-muted-foreground">{SHELL_RIGHT_PANEL_MESSAGES.chatFilesEmpty}</p>
      ) : null}

      <ul className="space-y-spacing-1">
        {documents.map((document) => {
          const artifact = isArtifactDocumentType(document.document_type)
          const Icon =
            document.document_type === 'image_upload' ? ImageIcon : artifact ? Boxes : FileText
          const fileUrl = documentFileUrl(document)
          return (
            <li key={`document:${document.id}`}>
              <button
                type="button"
                onClick={() =>
                  openArtifactInShell({
                    id: document.id,
                    title: document.title?.trim() || 'Untitled file',
                    type: documentTargetType(document),
                    entityId: document.resource_id ?? document.id,
                    entityTable: document.resource_id ? null : 'conversation_documents',
                    conversationId,
                    campaignId: document.campaign_id,
                    fileUrl,
                    mimeType: document.document_type === 'pdf' ? 'application/pdf' : null,
                    contextLabel: 'Chat',
                  })
                }
                className="body-3 text-foreground hover:bg-hover-subtle gap-spacing-2 px-spacing-2 py-spacing-2 flex w-full items-center rounded-lg text-left"
              >
                <Icon className="icon-sm text-muted-foreground shrink-0" aria-hidden />
                <span className="min-w-0 flex-1 truncate">
                  {document.title?.trim() || 'Untitled file'}
                </span>
              </button>
            </li>
          )
        })}

        {messageRows.map((row) => {
          const Icon =
            row.entityType === 'mission'
              ? Rocket
              : row.kind === 'image'
                ? ImageIcon
                : row.kind === 'video'
                  ? Video
                  : row.kind === 'artifact'
                    ? Boxes
                    : FileText
          const canOpen = Boolean(row.fileUrl || row.entityId)
          const openRow = () => {
            if (!canOpen) return
            openArtifactInShell({
              id: row.id,
              title: row.title,
              type: messageTargetType(row),
              entityId: row.entityId,
              conversationId,
              fileUrl: row.fileUrl,
              mimeType: row.mimeType,
              mediaAssetId: row.mediaAssetId,
              contextLabel: 'Chat',
            })
          }
          return (
            <li
              key={row.id}
              className="group relative"
              onContextMenu={(event) => {
                event.preventDefault()
                setActiveMenuRowId(row.id)
              }}
            >
              <div className="hover:bg-hover-subtle flex items-center rounded-lg">
                <button
                  type="button"
                  disabled={!canOpen}
                  onClick={openRow}
                  className={cn(
                    'body-3 text-foreground gap-spacing-2 px-spacing-2 py-spacing-2 flex min-w-0 flex-1 items-center text-left',
                    canOpen ? '' : 'cursor-default',
                  )}
                >
                  <Icon className="icon-sm text-muted-foreground shrink-0" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{row.title}</span>
                    {row.subtitle ? (
                      <span className="body-4 text-muted-foreground mt-spacing-1 block truncate">
                        {row.subtitle}
                      </span>
                    ) : null}
                  </span>
                </button>
                <button
                  type="button"
                  aria-label={`Output actions for ${row.title}`}
                  aria-expanded={activeMenuRowId === row.id}
                  onClick={() =>
                    setActiveMenuRowId((current) => (current === row.id ? null : row.id))
                  }
                  className={cn(
                    'btn-icon-bare mr-spacing-1 shrink-0 transition-opacity focus:opacity-100',
                    activeMenuRowId === row.id
                      ? 'opacity-100'
                      : 'opacity-0 group-hover:opacity-100',
                  )}
                >
                  <MoreHorizontal className="icon-sm" aria-hidden />
                </button>
              </div>
              {activeMenuRowId === row.id ? (
                <div
                  ref={menuRef}
                  className="dropdown-menu-solid p-spacing-1 z-dropdown absolute right-0 top-full min-w-36"
                >
                  {canOpen ? (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveMenuRowId(null)
                        openRow()
                      }}
                      className="body-4 text-foreground hover:bg-hover-subtle gap-spacing-2 px-spacing-2 py-spacing-2 flex w-full items-center rounded-md text-left"
                    >
                      <ExternalLink className="icon-sm" aria-hidden />
                      Open
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveMenuRowId(null)
                      showConversationMessageInChat(row.messageId)
                    }}
                    className="body-4 text-foreground hover:bg-hover-subtle gap-spacing-2 px-spacing-2 py-spacing-2 flex w-full items-center rounded-md text-left"
                  >
                    <LocateFixed className="icon-sm" aria-hidden />
                    Show in chat
                  </button>
                </div>
              ) : null}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
