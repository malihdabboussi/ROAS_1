'use client'

import { User } from 'lucide-react'
import { ARTIFACT_INLINE_SHELL_440 } from './artifact-inline-preview.constants'
import { useAvatarResolvedFields } from './hooks/useAvatarResolvedFields'

export function AvatarArtifactInlinePreview({
  artifactId,
  name,
  subtitle,
  career,
  age,
  backgroundProfile,
  imageUrl,
  onClick,
}: {
  artifactId: string
  name: string
  subtitle?: string
  career?: string
  age?: string
  backgroundProfile?: string
  imageUrl?: string
  onClick: () => void
}) {
  const { resolvedCareer, resolvedAge, resolvedBg, displayName } = useAvatarResolvedFields({
    artifactId,
    name,
    subtitle,
    career,
    age,
    backgroundProfile,
  })

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${ARTIFACT_INLINE_SHELL_440} flex flex-col`}
    >
      <div className="gap-spacing-4 border-border flex border-b max-md:px-3 max-md:py-3 md:px-spacing-4 md:py-spacing-4">
        <div className="pt-spacing-1 shrink-0">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt=""
              className="border-border h-16 w-16 rounded-full border-2 object-cover"
            />
          ) : (
            <div className="border-border bg-muted flex h-16 w-16 items-center justify-center rounded-full border-2">
              <User className="text-muted-foreground h-7 w-7" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="body-1 text-foreground font-semibold leading-snug">{displayName}</p>
          {resolvedCareer ? (
            <p className="body-2 text-muted-foreground mt-spacing-1">{resolvedCareer}</p>
          ) : null}
          {resolvedAge ? (
            <p className="body-3 text-muted-foreground mt-spacing-1">Age {resolvedAge}</p>
          ) : null}
        </div>
      </div>
      {resolvedBg ? (
        <div
          className="border-border relative overflow-hidden border-b max-md:px-3 max-md:py-3 md:px-spacing-4 md:py-spacing-3"
          style={{ maxHeight: 100 }}
        >
          <p className="body-3 text-muted-foreground whitespace-pre-line">{resolvedBg}</p>
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-10"
            style={{ background: 'linear-gradient(to bottom, transparent, var(--color-card))' }}
          />
        </div>
      ) : null}
      <div className="gap-spacing-2 flex items-center max-md:px-3 max-md:py-1 md:px-spacing-4 md:py-spacing-3">
        <User className="icon-sm text-muted-foreground shrink-0" />
        <span className="body-3 text-foreground min-w-0 truncate font-medium">{displayName}</span>
      </div>
    </button>
  )
}
