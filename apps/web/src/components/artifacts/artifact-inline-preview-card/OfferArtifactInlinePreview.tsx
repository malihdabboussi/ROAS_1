'use client'

import { Briefcase } from 'lucide-react'
import { ARTIFACT_INLINE_SHELL_440 } from './artifact-inline-preview.constants'
import { useOfferStepsState } from './hooks/useOfferStepsState'

export function OfferArtifactInlinePreview({
  artifactId,
  name,
  onClick,
}: {
  artifactId: string
  name: string
  onClick: () => void
}) {
  const steps = useOfferStepsState(artifactId)
  const completedCount = steps?.length ?? 0

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${ARTIFACT_INLINE_SHELL_440} flex flex-col`}
    >
      <div className="border-border relative min-h-[220px] overflow-hidden border-b max-md:min-h-[180px] max-md:px-3 max-md:py-3 md:px-spacing-4 md:py-spacing-4">
        {steps && steps.length > 0 ? (
          <div className="gap-spacing-3 flex flex-col">
            {steps.map((s) => (
              <div key={s.label}>
                <p className="typo-caption text-foreground font-semibold uppercase tracking-wide">
                  {s.label}
                </p>
                <p className="body-3 text-muted-foreground mt-spacing-1">{s.preview}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <Briefcase className="icon-lg text-muted-foreground animate-pulse" />
          </div>
        )}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-12"
          style={{ background: 'linear-gradient(to bottom, transparent, var(--color-card))' }}
        />
      </div>
      <div className="gap-spacing-2 flex items-center max-md:px-3 max-md:py-1 md:px-spacing-4 md:py-spacing-3">
        <Briefcase className="icon-sm text-muted-foreground shrink-0" />
        <span className="body-3 text-foreground min-w-0 truncate font-medium">{name}</span>
        {completedCount > 0 ? (
          <span className="typo-caption text-muted-foreground ml-auto shrink-0">
            {completedCount}/6 steps
          </span>
        ) : null}
      </div>
    </button>
  )
}
