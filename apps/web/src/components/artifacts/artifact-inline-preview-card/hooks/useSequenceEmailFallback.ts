'use client'

import { useEffect, useState } from 'react'
import { fetchSequence } from '@/lib/artifacts'
import { htmlEmailBodyToPreviewPlain } from '../artifact-inline-preview.utils'

export function useSequenceEmailFallback(
  artifactId: string,
  bodyPreview?: string,
  emailSubject?: string,
): {
  subject?: string
  bodyPreview?: string
  mode?: 'sequence' | 'broadcast'
} | null {
  const [fallback, setFallback] = useState<{
    subject?: string
    bodyPreview?: string
    mode?: 'sequence' | 'broadcast'
  } | null>(null)

  useEffect(() => {
    if (bodyPreview && emailSubject) return
    let cancelled = false
    fetchSequence(artifactId).then((sequence) => {
      if (cancelled) return
      const email = Array.isArray(sequence.sequence_emails)
        ? (sequence.sequence_emails[0] as
            | { subject?: string | null; body?: string | null }
            | undefined)
        : undefined

      const html = String(email?.body ?? '')
      const body = htmlEmailBodyToPreviewPlain(html, 220)
      const trigger = sequence?.trigger ?? {}
      const config = sequence?.config ?? {}
      const kind =
        trigger?.['type'] === 'broadcast' ||
        trigger?.['send_type'] === 'broadcast' ||
        config?.['type'] === 'broadcast' ||
        config?.['send_type'] === 'broadcast'
          ? 'broadcast'
          : 'sequence'

      setFallback({
        subject: email?.subject ?? undefined,
        bodyPreview: body || undefined,
        mode: kind,
      })
    })
    return () => {
      cancelled = true
    }
  }, [artifactId, bodyPreview, emailSubject])

  return fallback
}
