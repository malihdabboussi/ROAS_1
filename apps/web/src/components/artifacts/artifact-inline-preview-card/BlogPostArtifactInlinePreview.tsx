'use client'

import { FileText } from 'lucide-react'
import { ARTIFACT_INLINE_SHELL_440 } from './artifact-inline-preview.constants'
import { useBlogPostPreview } from './hooks/useBlogPostPreview'

export function BlogPostArtifactInlinePreview({
  artifactId,
  name,
  onClick,
}: {
  artifactId: string
  name: string
  onClick: () => void
}) {
  const fallback = useBlogPostPreview(artifactId)

  const title = fallback?.title ?? name
  const preview = fallback?.preview

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${ARTIFACT_INLINE_SHELL_440} flex flex-col`}
    >
      <div className="border-border bg-muted/30 relative flex min-h-[220px] flex-col justify-center overflow-hidden border-b max-md:min-h-[180px] max-md:px-3 max-md:py-4 md:px-spacing-5 md:py-spacing-5">
        <p className="body-1 text-foreground line-clamp-3 font-semibold leading-snug">{title}</p>
        {preview ? (
          <p className="body-3 text-muted-foreground mt-spacing-3 whitespace-pre-line">{preview}</p>
        ) : null}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-12"
          style={{ background: 'linear-gradient(to bottom, transparent, var(--color-card))' }}
        />
      </div>
      <div className="gap-spacing-2 flex items-center max-md:px-3 max-md:py-1 md:px-spacing-4 md:py-spacing-3">
        <FileText className="icon-sm text-muted-foreground shrink-0" />
        <span className="body-3 text-foreground min-w-0 truncate font-medium">{title}</span>
      </div>
    </button>
  )
}
