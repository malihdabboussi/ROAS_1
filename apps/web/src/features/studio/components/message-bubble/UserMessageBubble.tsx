'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Check, Copy, FileText, MoreVertical, Pencil } from 'lucide-react'
import type { ChatModelSettings } from '../../services/chat.service'
import type { DocumentAttachment, HighlightedArtifact, MessageReference } from '../../types'
import { ARTIFACT_GLASS, ARTIFACT_ICON, type ArtifactNodeType } from '../chat/ArtifactAttachments'
import { PersistedFileChips } from '../chat/FileAttachments'
import { ChatInput } from '../ChatInput'

const SLASH_CMD_REGEX = /(^|\s)(\/[a-zA-Z][a-zA-Z0-9_-]*)/gm

function highlightSlashCommands(text: string, knownSkillKeys?: Set<string>): ReactNode {
  const parts: ReactNode[] = []
  let lastIndex = 0
  let match
  SLASH_CMD_REGEX.lastIndex = 0
  while ((match = SLASH_CMD_REGEX.exec(text)) !== null) {
    const prefix = match[1]!
    const cmd = match[2]!
    const cmdKey = cmd.slice(1)
    const start = match.index
    if (start + prefix.length > lastIndex) {
      parts.push(text.slice(lastIndex, start + prefix.length))
    }
    const isSkill = knownSkillKeys?.has(cmdKey) ?? false
    parts.push(
      <span key={start} className={isSkill ? 'slash-skill-highlight' : 'slash-command-highlight'}>
        {cmd}
      </span>,
    )
    lastIndex = start + prefix.length + cmd.length
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex))
  return parts.length > 1 ? parts : text
}

function ArtifactIndicator({ artifacts }: { artifacts: HighlightedArtifact[] }) {
  if (artifacts.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {artifacts.map((a) => {
        const glass = ARTIFACT_GLASS[a.type as ArtifactNodeType] ?? 'badge-glass badge-glass-muted'
        const icon = ARTIFACT_ICON[a.type as ArtifactNodeType] ?? (
          <FileText className="h-3 w-3 shrink-0" />
        )
        return (
          <span
            key={a.id}
            className={`border-border inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs ${glass}`}
          >
            {icon}
            <span className="max-w-[100px] truncate" title={a.label}>
              {a.label}
            </span>
          </span>
        )
      })}
    </div>
  )
}

const REF_GLASS: Record<string, string> = {
  media: 'badge-glass badge-glass-cyan',
  mission: 'badge-glass badge-glass-orange',
  artifact: 'badge-glass badge-glass-purple',
}

function ReferenceIndicator({ references }: { references: MessageReference[] }) {
  if (references.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {references.map((r) => (
        <span
          key={`${r.kind}-${r.id}`}
          className={`border-border inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs ${REF_GLASS[r.kind] ?? 'badge-glass badge-glass-muted'}`}
        >
          <span className="max-w-[100px] truncate" title={r.label}>
            {r.label}
          </span>
        </span>
      ))}
    </div>
  )
}

export interface UserMessageBubbleProps {
  messageId: string
  content: string
  documents: DocumentAttachment[]
  highlightedArtifacts: HighlightedArtifact[]
  messageReferences: MessageReference[]
  stickyUser: boolean
  isEditable?: boolean
  onEditSubmit?: (
    newContent: string,
    documents?: DocumentAttachment[],
    model?: string,
    modelSettings?: ChatModelSettings,
  ) => void
  conversationId?: string | null
  knownSkillKeys?: Set<string>
  agentKey?: string
  campaignId?: string
}

const USER_MSG_MAX_LINES = 3

export function UserMessageBubble({
  messageId,
  content,
  documents,
  highlightedArtifacts,
  messageReferences,
  stickyUser,
  isEditable,
  onEditSubmit,
  conversationId,
  knownSkillKeys,
  agentKey,
  campaignId,
}: UserMessageBubbleProps) {
  const highlighted = useMemo(
    () => highlightSlashCommands(content, knownSkillKeys),
    [content, knownSkillKeys],
  )
  const [isEditing, setIsEditing] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const editRef = useRef<HTMLDivElement>(null)
  const bubbleRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const editNonceRef = useRef('')

  useEffect(() => {
    if (!isEditing) return
    const handler = (e: MouseEvent) => {
      if (editRef.current && !editRef.current.contains(e.target as Node)) {
        setIsEditing(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isEditing])

  useEffect(() => {
    if (!expanded) return
    const handler = (e: MouseEvent) => {
      if (bubbleRef.current && !bubbleRef.current.contains(e.target as Node)) {
        setExpanded(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [expanded])

  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  const handleEdit = useCallback(() => {
    if (!isEditable) return
    editNonceRef.current = crypto.randomUUID()
    setMenuOpen(false)
    setIsEditing(true)
  }, [isEditable])

  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(content)
    setCopied(true)
    setMenuOpen(false)
    setTimeout(() => setCopied(false), 1500)
  }, [content])

  const handleActivate = useCallback(() => {
    if (isEditable) {
      handleEdit()
      return
    }
    setExpanded((previous) => !previous)
  }, [handleEdit, isEditable])

  const handleEditSend = useCallback(
    (
      newContent: string,
      documents?: DocumentAttachment[],
      _artifacts?: unknown,
      model?: string,
      _references?: MessageReference[],
      modelSettings?: ChatModelSettings,
    ) => {
      if (!onEditSubmit) return
      setIsEditing(false)
      onEditSubmit(newContent, documents, model, modelSettings)
    },
    [onEditSubmit],
  )

  if (isEditing) {
    return (
      <div ref={editRef} data-message={messageId}>
        <ChatInput
          onSend={handleEditSend}
          initialValue={content}
          initialDocuments={documents.length > 0 ? documents : undefined}
          restoreNonce={editNonceRef.current}
          draftContextKeyOverride={`edit:${conversationId ?? 'unknown'}:${messageId}`}
          consumePendingComposerText={false}
          placeholder="Edit message..."
          agentKey={agentKey}
          campaignId={campaignId}
        />
      </div>
    )
  }

  return (
    <div
      ref={bubbleRef}
      data-message={messageId}
      className={[
        'card-glass card-glass-user px-spacing-4 py-spacing-2 group relative',
        stickyUser && '!bg-[var(--color-background)]',
        (isEditable || !expanded) && 'cursor-pointer',
      ]
        .filter(Boolean)
        .join(' ')}
      role="button"
      tabIndex={0}
      aria-label={isEditable ? 'Edit message' : expanded ? 'Collapse message' : 'Expand message'}
      onClick={handleActivate}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return
        if (event.key !== 'Enter' && event.key !== ' ') return
        event.preventDefault()
        handleActivate()
      }}
    >
      {isEditable ? (
        <div ref={menuRef} className="absolute right-2 top-2 z-10">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setMenuOpen((p) => !p)
            }}
            className="rounded p-0.5 opacity-0 transition-opacity hover:bg-[var(--color-secondary)] group-hover:opacity-100"
          >
            <MoreVertical className="text-muted-foreground h-3.5 w-3.5" />
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 top-full mt-1 w-32 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-1 shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={handleEdit}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-[var(--color-foreground)] hover:bg-[var(--color-secondary)]"
              >
                <Pencil className="h-3 w-3" /> Edit
              </button>
              <button
                type="button"
                onClick={handleCopy}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-[var(--color-foreground)] hover:bg-[var(--color-secondary)]"
              >
                <Copy className="h-3 w-3" /> Copy
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="absolute right-2 top-2 z-10">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              handleCopy()
            }}
            className="rounded p-0.5 opacity-0 transition-opacity hover:bg-[var(--color-secondary)] group-hover:opacity-100"
          >
            {copied ? (
              <Check className="text-muted-foreground h-3.5 w-3.5" />
            ) : (
              <Copy className="text-muted-foreground h-3.5 w-3.5" />
            )}
          </button>
        </div>
      )}
      <div
        className="body-1 text-chat overflow-hidden"
        style={{
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          ...(expanded
            ? {}
            : {
                display: '-webkit-box',
                WebkitLineClamp: USER_MSG_MAX_LINES,
                WebkitBoxOrient: 'vertical',
                WebkitMaskImage:
                  'linear-gradient(to bottom, black 0%, black 82%, transparent 100%)',
                maskImage: 'linear-gradient(to bottom, black 0%, black 82%, transparent 100%)',
              }),
        }}
      >
        {highlighted}
      </div>
      {documents.length > 0 || highlightedArtifacts.length > 0 || messageReferences.length > 0 ? (
        <div className="mt-spacing-2 flex flex-wrap items-center gap-1.5">
          <PersistedFileChips documents={documents} className="contents" />
          <ArtifactIndicator artifacts={highlightedArtifacts} />
          <ReferenceIndicator references={messageReferences} />
        </div>
      ) : null}
    </div>
  )
}
