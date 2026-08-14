'use client'

import type { ReactNode } from 'react'
import { FileText } from 'lucide-react'
import {
  ARTIFACT_GLASS,
  ARTIFACT_INLINE_SHELL_420,
  artifactTypeToNodeType,
  ICON_MAP,
  LABEL_MAP,
} from './artifact-inline-preview.constants'
import type { ArtifactPreviewType } from './artifact-inline-preview.types'

export function DefaultArtifactInlinePreview({
  artifactType,
  name,
  subtitle,
  imageUrl,
  status,
  onClick,
}: {
  artifactType: ArtifactPreviewType
  name: string
  subtitle?: string
  imageUrl?: string
  status?: ReactNode
  onClick: () => void
}) {
  const icon = ICON_MAP[artifactType] ?? <FileText className="icon-sm shrink-0" />
  const label = LABEL_MAP[artifactType] ?? artifactType
  const glassClass =
    ARTIFACT_GLASS[artifactTypeToNodeType(artifactType)] ?? 'badge-glass badge-glass-muted'

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${ARTIFACT_INLINE_SHELL_420} gap-spacing-3 md:gap-spacing-3 md:p-spacing-3 flex w-full max-w-full items-center max-md:min-h-[3.5rem] max-md:gap-2 max-md:px-3 max-md:py-2`}
    >
      {imageUrl ? (
        <div className="h-spacing-14 w-spacing-14 border-border bg-muted rounded-spacing-2 shrink-0 overflow-hidden border">
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        </div>
      ) : (
        <div className="h-spacing-14 w-spacing-14 border-border bg-muted rounded-spacing-2 flex shrink-0 items-center justify-center border">
          {icon}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <span className="body-3 text-foreground truncate font-medium">{name}</span>
        {subtitle ? (
          <p className="typo-caption text-muted-foreground mt-spacing-1 line-clamp-1">{subtitle}</p>
        ) : null}
        <div className="gap-spacing-2 mt-spacing-1 flex items-center">
          <span className={`${glassClass} typo-caption shrink-0 font-medium uppercase`}>
            {label}
          </span>
          {status ? <span className="typo-caption text-muted-foreground">{status}</span> : null}
        </div>
      </div>
    </button>
  )
}
