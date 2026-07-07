'use client'

import { Mail } from 'lucide-react'
import { ARTIFACT_INLINE_SHELL_440 } from './artifact-inline-preview.constants'
import { useSequenceEmailFallback } from './hooks/useSequenceEmailFallback'

export function EmailSequenceArtifactInlinePreview({
  artifactId,
  name,
  bodyPreview,
  emailSubject,
  onClick,
}: {
  artifactId: string
  name: string
  bodyPreview?: string
  emailSubject?: string
  onClick: () => void
}) {
  const fallback = useSequenceEmailFallback(artifactId, bodyPreview, emailSubject)

  const subject = emailSubject ?? fallback?.subject ?? name
  const resolvedBodyPreview = bodyPreview ?? fallback?.bodyPreview
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${ARTIFACT_INLINE_SHELL_440} flex flex-col`}
    >
      <div className="border-border relative min-h-[220px] overflow-hidden border-b max-md:min-h-[180px] max-md:px-3 max-md:py-3 md:px-spacing-4 md:py-spacing-4">
        {resolvedBodyPreview ? (
          <p className="body-3 text-muted-foreground whitespace-pre-line">{resolvedBodyPreview}</p>
        ) : (
          <div className="flex h-full items-center justify-center">
            <Mail className="icon-lg text-muted-foreground animate-pulse" />
          </div>
        )}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-12"
          style={{ background: 'linear-gradient(to bottom, transparent, var(--color-card))' }}
        />
      </div>
      <div className="gap-spacing-2 flex items-center max-md:px-3 max-md:py-1 md:px-spacing-4 md:py-spacing-3">
        <Mail className="icon-sm text-muted-foreground shrink-0" />
        <span className="body-3 text-foreground min-w-0 truncate font-medium">{subject}</span>
      </div>
    </button>
  )
}
