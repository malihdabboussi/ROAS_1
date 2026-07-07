'use client'

import { useRef } from 'react'
import { ArrowLeft } from 'lucide-react'
import { FunnelTweaksControls } from '@/features/studio/components/preview/FunnelTweaksControls'

interface FunnelTweaksChatViewProps {
  funnelId: string
  funnelName: string
  onBack: () => void
}

export function FunnelTweaksChatView({ funnelId, funnelName, onBack }: FunnelTweaksChatViewProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null)

  return (
    <div className="surface-bg flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="border-border pt-spacing-2 pb-spacing-1 relative shrink-0 border-b px-3 md:px-4">
        <div className="gap-spacing-2 mx-auto flex w-full max-w-3xl items-center">
          <button
            type="button"
            onClick={onBack}
            className="text-muted-foreground hover:text-foreground h-spacing-8 w-spacing-8 rounded-spacing-2 hover:bg-hover-subtle flex shrink-0 items-center justify-center transition-colors"
            aria-label="Back to conversation"
            title="Back to conversation"
          >
            <ArrowLeft className="icon-sm" aria-hidden />
          </button>
          <div className="min-w-0 flex-1">
            <p className="body-2 text-foreground font-semibold">Tweaks</p>
            <p className="body-4 text-muted-foreground truncate">{funnelName}</p>
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-3 md:px-4">
        <div className="py-spacing-4 mx-auto w-full max-w-3xl">
          <FunnelTweaksControls funnelId={funnelId} />
        </div>
      </div>

      <div className="border-border py-spacing-3 shrink-0 border-t px-3 md:px-4">
        <p className="typo-caption text-muted-foreground mx-auto w-full max-w-3xl text-center">
          Theme tweaks apply live on the page and save automatically.
        </p>
      </div>
    </div>
  )
}
