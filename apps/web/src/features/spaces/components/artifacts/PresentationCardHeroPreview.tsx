'use client'

import { LayoutTemplate } from 'lucide-react'
import { TsxMiniIframe } from '@/components/artifacts/TsxMiniIframe'
import { PresentationSlideMiniPreview } from '@/components/presentations/PresentationSlideMiniPreview'
import { usePresentationCardPreview } from '@/lib/presentations/use-presentation-card-preview'

/** Match `FunnelCardHeroPreview`: fixed hero height for Spaces wide grid cards. */
const PRESENTATION_CARD_HERO_H = 'h-44'

export function PresentationCardHeroPreview({ presentationId }: { presentationId: string }) {
  const { payload, loading } = usePresentationCardPreview(presentationId)

  return (
    <div
      className={`relative w-full shrink-0 overflow-hidden border-b border-[var(--border)] bg-[var(--color-hover-subtle)] ${PRESENTATION_CARD_HERO_H}`}
    >
      {payload?.mode === 'tsx' ? (
        <TsxMiniIframe code={payload.code} css={payload.css} title="Presentation hero preview" />
      ) : payload?.mode === 'html' ? (
        <PresentationSlideMiniPreview srcDoc={payload.srcDoc} title="Presentation hero preview" />
      ) : payload?.mode === 'iframe' ? (
        <iframe
          src={payload.url}
          className="h-full w-full border-none"
          title="Presentation hero preview"
        />
      ) : loading ? (
        <div className="flex h-full items-center justify-center">
          <LayoutTemplate className="h-6 w-6 animate-pulse text-[var(--color-muted-foreground)]" />
        </div>
      ) : (
        <div className="flex h-full items-center justify-center">
          <LayoutTemplate className="text-[var(--color-muted-foreground)]/60 h-6 w-6" />
        </div>
      )}
    </div>
  )
}
