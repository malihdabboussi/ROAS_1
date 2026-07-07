'use client'

import { Gift } from 'lucide-react'
import { PresentationSlideMiniPreview } from '@/components/presentations/PresentationSlideMiniPreview'
import { ARTIFACT_CHAT_PREVIEW_PANE_PX } from '@/lib/chat/artifact-preview-layout'
import { TsxMiniIframe } from '@/components/artifacts/TsxMiniIframe'
import { ARTIFACT_INLINE_SHELL_400 } from './artifact-inline-preview.constants'
import { usePresentationHtml } from './hooks/usePresentationHtml'

export function PresentationArtifactInlinePreview({
  artifactId,
  name,
  onClick,
}: {
  artifactId: string
  name: string
  onClick: () => void
}) {
  const presentation = usePresentationHtml(artifactId)

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
        {presentation?.mode === 'tsx' ? (
          <TsxMiniIframe code={presentation.code} title="Presentation preview" />
        ) : presentation?.mode === 'html' ? (
          <PresentationSlideMiniPreview srcDoc={presentation.srcDoc} title="Presentation preview" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Gift className="icon-lg text-muted-foreground animate-pulse" />
          </div>
        )}
      </div>
      <div className="gap-spacing-2 md:px-spacing-3 md:py-spacing-2 flex items-center max-md:px-3 max-md:py-1">
        <Gift className="icon-sm text-muted-foreground shrink-0" />
        <span className="body-3 text-foreground min-w-0 truncate font-medium">{name}</span>
      </div>
    </button>
  )
}
