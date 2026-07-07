'use client'

import { LayoutTemplate } from 'lucide-react'
import { useFunnelPagePreview } from '@/lib/artifacts/use-funnel-page-preview'
import { TsxMiniIframe } from '@/components/artifacts/TsxMiniIframe'

/** Fixed preview strip height for Spaces funnel grid cards (hero = first funnel page TSX/CSS). */
const FUNNEL_CARD_HERO_H = 'h-44'

export function FunnelCardHeroPreview({ funnelId }: { funnelId: string }) {
  const page = useFunnelPagePreview(funnelId, undefined)

  return (
    <div
      className={`relative w-full shrink-0 overflow-hidden border-b border-[var(--border)] bg-[var(--color-hover-subtle)] ${FUNNEL_CARD_HERO_H}`}
    >
      {page ? (
        <TsxMiniIframe code={page.code} css={page.css ?? ''} title="Funnel hero preview" />
      ) : (
        <div className="flex h-full items-center justify-center">
          <LayoutTemplate className="h-6 w-6 animate-pulse text-[var(--color-muted-foreground)]" />
        </div>
      )}
    </div>
  )
}
