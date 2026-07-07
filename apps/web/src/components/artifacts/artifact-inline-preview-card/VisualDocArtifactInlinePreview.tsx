'use client'

import { FileText } from 'lucide-react'
import { HtmlMiniIframe } from '@/components/ui/HtmlMiniIframe'
import { ARTIFACT_CHAT_PREVIEW_PANE_PX } from '@/lib/chat/artifact-preview-layout'
import { ARTIFACT_INLINE_SHELL_400 } from './artifact-inline-preview.constants'
import { useVisualDocPreview } from './hooks/useVisualDocPreview'

export function VisualDocArtifactInlinePreview({
  artifactId,
  spaceId,
  name,
  onClick,
}: {
  artifactId: string
  spaceId?: string
  name: string
  onClick: () => void
}) {
  const html = useVisualDocPreview(artifactId, spaceId)

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${ARTIFACT_INLINE_SHELL_400} flex flex-col`}
    >
      <div
        className="border-border bg-muted relative overflow-hidden border-b"
        style={{ height: ARTIFACT_CHAT_PREVIEW_PANE_PX }}
      >
        {html ? (
          <HtmlMiniIframe html={html} title="Visual doc preview" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <FileText className="icon-lg text-muted-foreground animate-pulse" />
          </div>
        )}
      </div>
      <div className="gap-spacing-2 md:px-spacing-3 md:py-spacing-2 flex items-center max-md:px-3 max-md:py-1">
        <FileText className="icon-sm text-muted-foreground shrink-0" />
        <span className="body-3 text-foreground min-w-0 truncate font-medium">{name}</span>
      </div>
    </button>
  )
}
