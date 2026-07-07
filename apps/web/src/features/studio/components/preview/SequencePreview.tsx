'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AlertCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { STUDIO_INLINE_ERRORS } from '@/features/studio/config/studio-inline-errors.config'
import { sanitizeFilename } from '@/features/studio/utils/artifact-export'
import { stampMadeWithVibeyFooterOnAllPages } from '@/features/studio/utils/artifact-pdf-jspdf-footer'
import { RETRY_CONFIGS, withRetry } from '../../../../lib/utils/retry'
import {
  createSequenceEmail,
  fetchSequence,
  updateSequence,
  updateSequenceEmail,
} from '../../services/artifact-preview.service'
import type { Sequence } from '../../types'
import { SequenceEmailCarousel } from './SequenceEmailCarousel'
import {
  type SequenceEmailCardData,
  type SequenceEmailEditorSaveStatus,
} from './SequenceEmailEditorCard'
import { SequencePreviewToolbar } from './SequencePreviewToolbar'

interface SequencePreviewProps {
  sequenceId: string
  selectedEmailId?: string
  hideToolbar?: boolean
  /** Spaces deep-work: same toolbar row as title (e.g. Back) — matches funnel / presentation. */
  leadingChrome?: ReactNode
  /** Close / deep-work extras — `FunnelToolbar` `trailingChrome`. */
  trailingChrome?: ReactNode
  /** Fullscreen — divider before this when set (`FunnelToolbar` `publishAdjacentChrome`). */
  publishAdjacentChrome?: ReactNode
  /** Spaces slide-over: opens full in-place view (`?artifact=`). */
  onOpenFullView?: () => void
  /** Called after the kebab-menu delete completes (host clears selection). */
  onResourceDeleted?: () => void
  /** Spaces `?artifact=` full mode: centered single-column card (`container-modal-md`). */
  centerEmailCard?: boolean
}

// ============================================================================
// Main Component
// ============================================================================

export function SequencePreview({
  sequenceId,
  selectedEmailId,
  hideToolbar,
  leadingChrome,
  trailingChrome,
  publishAdjacentChrome,
  onOpenFullView,
  onResourceDeleted,
  centerEmailCard = false,
}: SequencePreviewProps) {
  const [sequence, setSequence] = useState<Sequence | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [addingEmail, setAddingEmail] = useState(false)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const pendingSelectedEmailIdRef = useRef<string | null>(null)

  useEffect(() => {
    setMenuOpen(false)
  }, [sequenceId])

  const handleExportPdf = useCallback(async () => {
    if (!sequence || exportingPdf) return
    const emails = [...(sequence.sequence_emails ?? [])].sort(
      (a, b) => a.order_index - b.order_index,
    )
    if (emails.length === 0) return
    setExportingPdf(true)
    let cleanup: (() => void) | null = null
    try {
      const html2pdf = (await import('html2pdf.js')).default
      const basename = sanitizeFilename(sequence.name ?? '', 'sequence')
      const host = document.createElement('div')
      host.style.cssText =
        'position:fixed;left:-100000px;top:0;width:186mm;opacity:0;pointer-events:none'
      host.setAttribute('aria-hidden', 'true')

      const root = document.createElement('div')
      root.style.cssText = 'font-family:system-ui,sans-serif;color:#111;line-height:1.6'
      emails.forEach((email, idx) => {
        const section = document.createElement('div')
        section.style.cssText =
          idx > 0 ? 'page-break-before:always;padding-top:12px' : 'padding-top:12px'
        const heading = document.createElement('h2')
        heading.style.cssText = 'font-size:16px;font-weight:700;margin:0 0 4px'
        heading.textContent = email.subject ?? `Email ${idx + 1}`
        section.appendChild(heading)
        const delay = document.createElement('p')
        delay.style.cssText = 'font-size:11px;color:#888;margin:0 0 12px'
        delay.textContent = idx === 0 ? 'First email' : `${email.delay_hours}h after previous`
        section.appendChild(delay)
        const body = document.createElement('div')
        body.style.cssText = 'font-size:13px'
        body.innerHTML = email.body ?? ''
        section.appendChild(body)
        root.appendChild(section)
      })
      host.appendChild(root)
      document.body.appendChild(host)
      cleanup = () => host.parentNode?.removeChild(host)
      await new Promise((r) => setTimeout(r, 200))

      const opt = {
        margin: [12, 12, 18, 12] as [number, number, number, number],
        filename: `${basename}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      }
      const worker = (html2pdf() as any).set(opt)['from'](root)
      await worker.toPdf()
      const pdf = await worker.get('pdf')
      stampMadeWithVibeyFooterOnAllPages(pdf)
      await worker.save()
    } catch {
      toast.error('Failed to export sequence as PDF')
    } finally {
      if (cleanup) cleanup()
      setExportingPdf(false)
    }
  }, [sequence, exportingPdf])

  const loadSequence = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setSequence(await fetchSequence(sequenceId))
    } catch (err) {
      setError(err instanceof Error ? err.message : STUDIO_INLINE_ERRORS.LOAD_SEQUENCE)
    } finally {
      setLoading(false)
    }
  }, [sequenceId])

  const handleAddEmail = useCallback(async () => {
    if (addingEmail) return
    setAddingEmail(true)
    try {
      const email = await createSequenceEmail(sequenceId)
      pendingSelectedEmailIdRef.current = email.id
      const next = await fetchSequence(sequenceId)
      setSequence(next)
      const sorted = [...(next.sequence_emails ?? [])].sort((a, b) => a.order_index - b.order_index)
      const idx = sorted.findIndex((e) => e.id === email.id)
      if (idx >= 0) setActiveIndex(idx)
    } catch {
      toast.error('Could not add email')
    } finally {
      setAddingEmail(false)
    }
  }, [addingEmail, sequenceId])

  useEffect(() => {
    void loadSequence()
  }, [loadSequence])

  useEffect(() => {
    const emails = sequence?.sequence_emails
    if (!selectedEmailId || !emails || emails.length === 0) return
    const sortedEmails = [...emails].sort((a, b) => a.order_index - b.order_index)
    const nextIndex = sortedEmails.findIndex((email) => email.id === selectedEmailId)
    if (nextIndex >= 0) setActiveIndex(nextIndex)
  }, [selectedEmailId, sequence?.sequence_emails])

  // Auto-save with retry
  const [saveStatus, setSaveStatus] = useState<SequenceEmailEditorSaveStatus>('idle')
  const [saveStatusEmailId, setSaveStatusEmailId] = useState<string | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savingRef = useRef(false)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const patchLocalEmail = useCallback(
    (
      emailId: string,
      patch: Partial<Pick<SequenceEmailCardData, 'body' | 'status' | 'delay_hours'>>,
    ) => {
      setSequence((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          sequence_emails: (prev.sequence_emails ?? []).map((email) =>
            email.id === emailId ? ({ ...email, ...patch } as typeof email) : email,
          ),
        }
      })
    },
    [],
  )

  const handleBodyChange = useCallback(
    (emailId: string, html: string) => {
      patchLocalEmail(emailId, { body: html })
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      setSaveStatus('idle')
      setSaveStatusEmailId(null)

      saveTimerRef.current = setTimeout(async () => {
        if (savingRef.current) return
        savingRef.current = true
        setSaveStatusEmailId(emailId)
        setSaveStatus('saving')
        try {
          await withRetry(
            () => updateSequenceEmail(sequenceId, emailId, { body: html }),
            RETRY_CONFIGS.API_CALL,
          )
          setSaveStatus('saved')
          savedTimerRef.current = setTimeout(() => {
            setSaveStatus('idle')
            setSaveStatusEmailId(null)
          }, 2000)
        } catch {
          toast.error(STUDIO_INLINE_ERRORS.SAVE_EMAIL)
          setSaveStatus('error')
        } finally {
          savingRef.current = false
        }
      }, 1000)
    },
    [patchLocalEmail, sequenceId],
  )

  const handleEmailSettingsChange = useCallback(
    async (
      emailId: string,
      patch: Partial<Pick<SequenceEmailCardData, 'status' | 'delay_hours' | 'subject'>>,
    ) => {
      patchLocalEmail(emailId, patch)
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      setSaveStatusEmailId(emailId)
      setSaveStatus('saving')
      try {
        await withRetry(
          () =>
            updateSequenceEmail(sequenceId, emailId, {
              status: patch.status as 'draft' | 'ready' | 'sent' | undefined,
              delay_hours: patch.delay_hours,
              subject: patch.subject ?? undefined,
            }),
          RETRY_CONFIGS.API_CALL,
        )
        setSaveStatus('saved')
        savedTimerRef.current = setTimeout(() => {
          setSaveStatus('idle')
          setSaveStatusEmailId(null)
        }, 2000)
      } catch {
        toast.error(STUDIO_INLINE_ERRORS.SAVE_EMAIL)
        setSaveStatus('error')
      }
    },
    [patchLocalEmail, sequenceId],
  )

  const commitSequenceName = useCallback(
    async (next: string) => {
      if (!sequence) return
      try {
        const updated = await withRetry(
          () => updateSequence(sequenceId, next),
          RETRY_CONFIGS.API_CALL,
        )
        setSequence(updated)
      } catch {
        toast.error('Failed to save sequence')
      }
    },
    [sequence, sequenceId],
  )

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') setActiveIndex((i) => Math.max(0, i - 1))
      if (e.key === 'ArrowRight')
        setActiveIndex((i) => {
          const max = (sequence?.sequence_emails?.length ?? 1) - 1
          return Math.min(max, i + 1)
        })
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [sequence?.sequence_emails?.length])

  const sortedEmails = useMemo(
    () => [...(sequence?.sequence_emails ?? [])].sort((a, b) => a.order_index - b.order_index),
    [sequence?.sequence_emails],
  )

  const emails: SequenceEmailCardData[] = useMemo(
    () => sortedEmails.map((email) => ({ ...email })),
    [sortedEmails],
  )

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    )
  }

  if (error || !sequence) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2">
        <AlertCircle className="text-muted-foreground/40 h-8 w-8" />
        <p className="text-muted-foreground text-sm">{error ?? 'Sequence not found'}</p>
      </div>
    )
  }

  const goPrev = () => setActiveIndex((i) => Math.max(0, i - 1))
  const goNext = () => setActiveIndex((i) => Math.min(emails.length - 1, i + 1))

  return (
    <div className="flex h-full flex-col">
      {!hideToolbar ? (
        <SequencePreviewToolbar
          sequence={{
            id: sequence.id,
            name: sequence.name ?? null,
            campaign_id: sequence.campaign_id ?? null,
          }}
          emailCount={emails.length}
          leadingChrome={leadingChrome}
          trailingChrome={trailingChrome}
          publishAdjacentChrome={publishAdjacentChrome}
          exportingPdf={exportingPdf}
          addingEmail={addingEmail}
          menuOpen={menuOpen}
          menuButtonRef={menuButtonRef}
          onExportPdf={() => void handleExportPdf()}
          onAddEmail={() => void handleAddEmail()}
          onSequenceNameCommit={commitSequenceName}
          onToggleMenu={() => setMenuOpen((open) => !open)}
          onCloseMenu={() => setMenuOpen(false)}
          onChanged={() => {
            void loadSequence()
          }}
          onOpenFullView={onOpenFullView}
          onResourceDeleted={onResourceDeleted}
        />
      ) : null}

      <SequenceEmailCarousel
        emails={emails}
        activeIndex={activeIndex}
        centerEmailCard={centerEmailCard}
        saveStatusEmailId={saveStatusEmailId}
        saveStatus={saveStatus}
        onPrevious={goPrev}
        onNext={goNext}
        onSelectIndex={setActiveIndex}
        onBodyChange={handleBodyChange}
        onEmailSettingsChange={handleEmailSettingsChange}
      />
    </div>
  )
}
