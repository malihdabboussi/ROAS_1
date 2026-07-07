'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Check, Download, ListTodo, Loader2, MoreVertical, Send } from 'lucide-react'
import { toast } from 'sonner'
import { EmailPreviewEditor, InlineEditableArtifactTitle } from '@/components/artifacts'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import {
  ARTIFACT_INLINE_ERRORS,
  type EmailArtifact,
  type EmailMenuTarget,
  fetchEmailArtifact,
  updateEmailArtifact,
} from '@/lib/artifacts'
import { RETRY_CONFIGS, withRetry } from '@/lib/utils/retry'
import { CAMPAIGN_EMAIL_MERGE_FIELDS } from '../../../utils/email-merge-fields'
import { EmailArtifactSendDialog } from './EmailArtifactSendDialog'
import { EmailMenuDropdown } from './EmailMenuDropdown'
import { exportEmailArtifactPdf } from './export-email-artifact-pdf'

/** Matches FunnelToolbar viewport utility + options kebab in artifact preview. */
const ARTIFACT_UTILITY_ICON_CLASS =
  'tooltip inline-flex h-spacing-7 w-7 shrink-0 items-center justify-center rounded-spacing-2 text-muted-foreground transition-colors hover:bg-hover-subtle hover:text-foreground'
const ARTIFACT_KEBAB_ICON_CLASS =
  'rounded-spacing-2 border border-border p-spacing-1 text-muted-foreground transition-colors hover:bg-hover-subtle hover:text-foreground'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === 'idle') return null
  return (
    <span className="typo-caption gap-spacing-1 flex items-center transition-opacity">
      {status === 'saving' && (
        <>
          <Loader2 className="icon-xs text-muted-foreground animate-spin" />
          <span className="text-muted-foreground">Saving</span>
        </>
      )}
      {status === 'saved' && (
        <>
          <Check className="icon-xs text-success" />
          <span className="text-success">Saved</span>
        </>
      )}
      {status === 'error' && <span className="text-destructive">Save failed</span>}
    </span>
  )
}

export function EmailArtifactPreview({
  emailId,
  toolbarLeading,
  trailingChrome,
  publishAdjacentChrome,
  onOpenFullView,
  onResourceDeleted,
  centerEmailCard = false,
}: {
  emailId: string
  toolbarLeading?: ReactNode
  /** Close / deep-work extras — same slot as `FunnelToolbar` `trailingChrome`. */
  trailingChrome?: ReactNode
  /** Fullscreen — divider before this when set (`FunnelToolbar` `publishAdjacentChrome`). */
  publishAdjacentChrome?: ReactNode
  onOpenFullView?: () => void
  onResourceDeleted?: () => void
  centerEmailCard?: boolean
}) {
  const [email, setEmail] = useState<EmailArtifact | null>(null)
  const [loading, setLoading] = useState(true)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [sendOpen, setSendOpen] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)
  const menuButtonRef = useRef<HTMLButtonElement>(null)

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const subjectSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savingRef = useRef(false)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadEmail = useCallback(async () => {
    setLoading(true)
    try {
      const row = await fetchEmailArtifact(emailId)
      setEmail(row)
      setSubject(row.subject)
      setBody(row.body)
    } catch {
      toast.error('Failed to load email')
    } finally {
      setLoading(false)
    }
  }, [emailId])

  useEffect(() => {
    void loadEmail()
  }, [loadEmail])

  useEffect(() => {
    setMenuOpen(false)
  }, [emailId])

  const flushSave = useCallback(
    async (patch: { subject?: string; body?: string }) => {
      if (savingRef.current) return
      savingRef.current = true
      setSaveStatus('saving')
      try {
        const updated = await withRetry(
          () => updateEmailArtifact(emailId, patch),
          RETRY_CONFIGS.API_CALL,
        )
        setEmail(updated)
        setSubject(updated.subject)
        setBody(updated.body)
        setSaveStatus('saved')
        if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
        savedTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000)
      } catch {
        toast.error(ARTIFACT_INLINE_ERRORS.SAVE_EMAIL)
        setSaveStatus('error')
      } finally {
        savingRef.current = false
      }
    },
    [emailId],
  )

  const scheduleBodySave = useCallback(
    (html: string) => {
      setBody(html)
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      setSaveStatus('idle')
      saveTimerRef.current = setTimeout(() => {
        void flushSave({ body: html })
      }, 1000)
    },
    [flushSave],
  )

  const commitSubject = useCallback(
    async (next: string) => {
      setSubject(next)
      if (subjectSaveTimerRef.current) clearTimeout(subjectSaveTimerRef.current)
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      await flushSave({ subject: next })
    },
    [flushSave],
  )

  const handleExportPdf = useCallback(async () => {
    if (exportingPdf) return
    setExportingPdf(true)
    try {
      await exportEmailArtifactPdf(subject, body)
    } finally {
      setExportingPdf(false)
    }
  }, [body, exportingPdf, subject])

  const openLinkedTask = useCallback(() => {
    if (!email?.source_item_id || !email.space_id) return
    window.dispatchEvent(
      new CustomEvent('space-vibey:open-task', {
        detail: { itemId: email.source_item_id, spaceId: email.space_id },
      }),
    )
  }, [email?.source_item_id, email?.space_id])

  const menuTarget: EmailMenuTarget | null = email
    ? {
        id: email.id,
        subject: email.subject ?? null,
        campaign_id: email.campaign_id ?? null,
      }
    : null

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <VibeyLoadingOrb size="sm" text="Loading email draft..." />
      </div>
    )
  }

  if (!email) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="body-3 text-muted-foreground">Email not found</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="border-border flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {toolbarLeading}
          <div className="min-w-0 flex-1">
            <InlineEditableArtifactTitle
              value={subject}
              placeholder="Untitled Email"
              onCommit={commitSubject}
            />
          </div>
        </div>
        <div className="flex min-w-0 shrink-0 flex-nowrap items-center gap-1">
          <SaveIndicator status={saveStatus} />
          <button
            type="button"
            onClick={() => void handleExportPdf()}
            disabled={exportingPdf}
            data-tooltip="Download as PDF"
            data-side="bottom"
            className={`${ARTIFACT_UTILITY_ICON_CLASS} disabled:opacity-50`}
            aria-label="Download as PDF"
          >
            <Download className="icon-sm shrink-0" />
          </button>
          {email.source_item_id ? (
            <button
              type="button"
              onClick={openLinkedTask}
              data-tooltip="Open linked task"
              data-side="bottom"
              className={ARTIFACT_UTILITY_ICON_CLASS}
              aria-label="Open linked task"
            >
              <ListTodo className="icon-sm shrink-0" />
            </button>
          ) : null}
          {trailingChrome}
          {publishAdjacentChrome ? (
            <span aria-hidden className="border-l-glass mx-1 h-4 w-0 shrink-0 self-center" />
          ) : null}
          {publishAdjacentChrome}
          <button
            ref={menuButtonRef}
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setMenuOpen((o) => !o)
            }}
            data-tooltip="Email options"
            data-side="bottom"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className={ARTIFACT_KEBAB_ICON_CLASS}
            aria-label="Email options"
          >
            <MoreVertical className="icon-sm shrink-0" />
          </button>
          <button
            type="button"
            onClick={() => setSendOpen(true)}
            className="chip-glass-green rounded-spacing-2 h-spacing-8 gap-spacing-1 px-spacing-2 flex items-center transition-all"
            aria-label="Send email"
          >
            <Send className="icon-sm shrink-0" />
            <span className="body-3 font-medium">Send email</span>
          </button>
        </div>
      </div>

      {menuOpen && menuTarget ? (
        <EmailMenuDropdown
          email={menuTarget}
          anchorRef={menuButtonRef}
          onClose={() => setMenuOpen(false)}
          onChanged={() => void loadEmail()}
          onOpenFullView={
            onOpenFullView
              ? () => {
                  setMenuOpen(false)
                  onOpenFullView()
                }
              : undefined
          }
          onDeleted={onResourceDeleted}
        />
      ) : null}

      <div
        className={`px-spacing-3 flex min-h-0 flex-1 flex-col ${
          centerEmailCard ? 'mx-auto w-full max-w-full' : ''
        }`}
      >
        <div
          className={
            centerEmailCard
              ? 'container-modal-md py-spacing-3 flex min-h-0 w-full flex-1 flex-col'
              : 'py-spacing-3 flex min-h-0 w-full flex-1 flex-col'
          }
        >
          <div className="card-glass rounded-spacing-4 flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1">
              <EmailPreviewEditor
                content={body}
                onContentChange={scheduleBodySave}
                placeholder="Start writing your email..."
                className="h-full rounded-none border-0"
                mergeFields={CAMPAIGN_EMAIL_MERGE_FIELDS}
              />
            </div>
          </div>
        </div>
      </div>

      <EmailArtifactSendDialog
        email={email}
        subject={subject}
        body={body}
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        onSent={() => void loadEmail()}
      />
    </div>
  )
}
