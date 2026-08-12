'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AudioLines,
  Boxes,
  Clapperboard,
  FileText,
  Filter,
  Globe,
  ImageIcon,
  Mail,
  Megaphone,
  Presentation,
  Share2,
  Tag,
  UserRound,
  type LucideIcon,
} from 'lucide-react'
import {
  fetchConversationDocuments,
  openArtifactInShell,
  type ConversationDocument,
  type ShellArtifactViewerTarget,
} from '@/lib/artifacts'
import { isArtifactDocumentType, type Message } from '@/lib/conversations'
import type { DeliverableType } from '@/lib/missions'
import { cn } from '@/lib/utils/cn'
import { extractConversationFileRows, type ConversationFileRow } from './shell-conversation-summary'
import {
  fileRowMeta,
  fileRowSubtitle,
  groupFileRowsByDay,
  type FileRowMeta,
} from './shell-right-panel-files.logic'
import { SHELL_RIGHT_PANEL_MESSAGES } from './shell-right-panel.messages.config'

const ARTIFACT_TYPE_ICONS: Record<string, LucideIcon> = {
  offer: Tag,
  avatar: UserRound,
  funnel: Filter,
  presentation: Presentation,
  sequence: Mail,
  email: Mail,
  website: Globe,
  ad: Megaphone,
  social_post: Share2,
  image_upload: ImageIcon,
}

const ATTACHMENT_KIND_ICONS: Record<string, LucideIcon> = {
  image: ImageIcon,
  video: Clapperboard,
  audio: AudioLines,
  file: FileText,
}

function rowIcon(kind: string, artifactType?: string | null): LucideIcon {
  const normalizedType = artifactType?.trim().toLowerCase() ?? ''
  if (normalizedType) return ARTIFACT_TYPE_ICONS[normalizedType] ?? Boxes
  return ATTACHMENT_KIND_ICONS[kind] ?? FileText
}

interface FilesDisplayRow {
  key: string
  title: string
  createdAt: string
  meta: FileRowMeta
  icon: LucideIcon
  /** Image preview shown instead of the icon tile (and as the hero cover). */
  thumbnailUrl: string | null
  canOpen: boolean
  open: ShellArtifactViewerTarget
}

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

function documentDisplayRow(
  document: ConversationDocument,
  conversationId: string,
): FilesDisplayRow {
  const fileUrl = documentFileUrl(document)
  const title = document.title?.trim() || 'Untitled file'
  return {
    key: `document:${document.id}`,
    title,
    createdAt: document.created_at,
    meta: fileRowMeta('file', document.document_type),
    icon: rowIcon('file', document.document_type),
    thumbnailUrl: document.document_type === 'image_upload' ? fileUrl : null,
    canOpen: true,
    open: {
      id: document.id,
      title,
      type: documentTargetType(document),
      entityId: document.resource_id ?? document.id,
      entityTable: document.resource_id ? null : 'conversation_documents',
      conversationId,
      campaignId: document.campaign_id,
      fileUrl,
      mimeType: document.document_type === 'pdf' ? 'application/pdf' : null,
      contextLabel: 'Chat',
    },
  }
}

function messageDisplayRow(row: ConversationFileRow, conversationId: string): FilesDisplayRow {
  const artifactType = row.kind === 'artifact' ? row.entityType : null
  return {
    key: row.id,
    title: row.title,
    createdAt: row.createdAt,
    meta: fileRowMeta(row.kind, artifactType),
    icon: rowIcon(row.kind, artifactType),
    thumbnailUrl: row.kind === 'image' ? row.fileUrl : null,
    canOpen: Boolean(row.fileUrl || row.entityId),
    open: {
      id: row.id,
      title: row.title,
      type:
        row.kind === 'artifact' ? ((row.entityType as DeliverableType | null) ?? 'file') : row.kind,
      entityId: row.entityId,
      conversationId,
      fileUrl: row.fileUrl,
      mimeType: row.mimeType,
      mediaAssetId: row.mediaAssetId,
      contextLabel: 'Chat',
    },
  }
}

function FileRowButton({ row, hero }: { row: FilesDisplayRow; hero: boolean }) {
  const Icon = row.icon
  const subtitle = fileRowSubtitle(row.meta.label, row.createdAt)
  if (hero && row.thumbnailUrl) {
    return (
      <button
        type="button"
        onClick={() => openArtifactInShell(row.open)}
        className="border-border hover:bg-hover-subtle block w-full overflow-hidden rounded-xl border text-left"
      >
        {}
        <img src={row.thumbnailUrl} alt="" className="h-24 w-full object-cover" />
        <span className="px-spacing-2 py-spacing-2 block">
          <span className="body-3 text-foreground block truncate font-medium">{row.title}</span>
          <span className="typo-xs text-muted-foreground block truncate">{subtitle}</span>
        </span>
      </button>
    )
  }
  return (
    <button
      type="button"
      disabled={!row.canOpen}
      onClick={() => openArtifactInShell(row.open)}
      className={cn(
        'gap-spacing-2 px-spacing-2 py-spacing-2 flex w-full items-center rounded-lg text-left',
        row.canOpen ? 'hover:bg-hover-subtle' : 'cursor-default',
      )}
    >
      {row.thumbnailUrl ? (
        <img src={row.thumbnailUrl} alt="" className="size-8 shrink-0 rounded-md object-cover" />
      ) : (
        <span
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-md',
            row.meta.glassClass,
          )}
        >
          <Icon className="icon-sm" aria-hidden />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="body-3 text-foreground block truncate">{row.title}</span>
        <span className="typo-xs text-muted-foreground block truncate">{subtitle}</span>
      </span>
    </button>
  )
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

  const groups = useMemo(() => {
    const rows = [
      ...documents.map((document) => documentDisplayRow(document, conversationId)),
      ...messageRows.map((row) => messageDisplayRow(row, conversationId)),
    ]
    return groupFileRowsByDay(rows)
  }, [conversationId, documents, messageRows])

  const heroKey = useMemo(() => {
    for (const group of groups) {
      for (const row of group.rows) {
        if (row.thumbnailUrl && row.canOpen) return row.key
      }
    }
    return null
  }, [groups])

  const empty = !loading && groups.length === 0

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

      {groups.map((group) => (
        <section key={group.label} aria-label={group.label}>
          <p className="typo-caption text-muted-foreground px-spacing-2 pb-spacing-1 font-medium uppercase tracking-wide">
            {group.label}
          </p>
          <ul className="space-y-spacing-1">
            {group.rows.map((row) => (
              <li key={row.key}>
                <FileRowButton row={row} hero={row.key === heroKey} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
