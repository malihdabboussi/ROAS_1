'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { EmailPreviewEditor } from '@/components/artifacts'
import {
  type EmailArtifact,
  fetchEmailArtifact,
  updateEmailArtifact,
} from '@/lib/artifacts'

/** Single-email preview for `DeliverablePreviewModal` — same TipTap chrome as sequence emails; no carousel. */
export function StandaloneEmailDeliverablePreview({ emailId }: { emailId: string }) {
  const [loading, setLoading] = useState(true)
  const [emailRow, setEmailRow] = useState<EmailArtifact | null>(null)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchEmailArtifact(emailId)
      .then((row) => {
        if (cancelled) return
        setEmailRow(row)
        setSubject(row.subject ?? '')
        setBody(row.body ?? '')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [emailId])

  const flushSave = useCallback(
    async (nextSubject: string, nextBody: string) => {
      if (!emailRow) return
      const updated = await updateEmailArtifact(emailId, {
        subject: nextSubject.trim() || '(no subject)',
        body: nextBody,
      })
      setEmailRow(updated)
    },
    [emailId, emailRow],
  )

  const scheduleSave = useCallback(
    (nextSubject: string, nextBody: string) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        saveTimerRef.current = null
        void flushSave(nextSubject, nextBody)
      }, 800)
    },
    [flushSave],
  )

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [])

  if (loading) {
    return (
      <div className="py-spacing-16 flex min-h-0 flex-1 items-center justify-center">
        <Loader2 className="icon-md text-muted-foreground animate-spin" />
      </div>
    )
  }

  if (!emailRow) {
    return (
      <div className="body-2 text-muted-foreground py-spacing-6 text-center">
        Email draft could not be loaded.
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="card-glass rounded-spacing-4 flex min-h-0 flex-1 flex-col">
        <div className="border-border gap-spacing-2 flex shrink-0 flex-col border-b px-spacing-3 py-spacing-2">
          <label className="space-y-spacing-1 flex flex-col">
            <span className="typo-caption text-muted-foreground font-medium">Subject</span>
            <input
              value={subject}
              onChange={(event) => {
                const next = event.target.value
                setSubject(next)
                scheduleSave(next, body)
              }}
              className="body-3 h-spacing-10 rounded-spacing-2 border-border bg-background px-spacing-3 text-foreground placeholder:text-muted-foreground/60 w-full border outline-none"
            />
          </label>
        </div>
        <div className="min-h-0 flex-1 px-spacing-3 pb-spacing-3 pt-spacing-2">
          <EmailPreviewEditor
            content={body}
            onContentChange={(html) => {
              setBody(html)
              scheduleSave(subject, html)
            }}
            placeholder="Start writing your email..."
            className="border-border rounded-spacing-2 h-spacing-96 border"
          />
        </div>
      </div>
    </div>
  )
}
