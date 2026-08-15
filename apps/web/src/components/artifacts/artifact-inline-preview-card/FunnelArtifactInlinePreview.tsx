'use client'

import { LayoutTemplate } from 'lucide-react'
import { TsxMiniIframe } from '@/components/artifacts/TsxMiniIframe'
import { useFunnelPagePreview } from '@/lib/artifacts/use-funnel-page-preview'
import { ARTIFACT_CHAT_PREVIEW_PANE_PX } from '@/lib/chat/artifact-preview-layout'
import { ARTIFACT_INLINE_SHELL_400 } from './artifact-inline-preview.constants'

export function FunnelArtifactInlinePreview({
  artifactId,
  funnelPageId,
  name,
  onClick,
}: {
  artifactId: string
  funnelPageId?: string
  name: string
  onClick: () => void
}) {
  const page = useFunnelPagePreview(artifactId, funnelPageId)
  const showLiveTsx = Boolean(page?.code && page.sourceMode !== 'html_bundle')

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
        {showLiveTsx && page ? (
          <TsxMiniIframe code={page.code} css={page.css} title="Funnel preview" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <LayoutTemplate className="icon-lg text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="gap-spacing-2 md:px-spacing-3 md:py-spacing-2 flex items-center max-md:px-3 max-md:py-1">
        <LayoutTemplate className="icon-sm text-muted-foreground shrink-0" />
        <span className="body-3 text-foreground min-w-0 truncate font-medium">{name}</span>
      </div>
    </button>
  )
}
