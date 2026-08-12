'use client'

import dynamic from 'next/dynamic'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { CANVAS_VIEW_MESSAGES } from './canvas-view.messages.config'

const WhiteboardCanvas = dynamic(
  () => import('./WhiteboardCanvas').then((mod) => mod.WhiteboardCanvas),
  {
    loading: () => (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <VibeyLoadingOrb text={CANVAS_VIEW_MESSAGES.loading} state="processing" size="lg" />
      </div>
    ),
  },
)

interface CampaignCanvasViewProps {
  campaignId: string | null
  emptyMessage?: string
}

export function CampaignCanvasView({ campaignId, emptyMessage }: CampaignCanvasViewProps) {
  if (!campaignId) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center text-center">
        <p className="body-3 text-muted-foreground">
          {emptyMessage ?? CANVAS_VIEW_MESSAGES.campaignRequired}
        </p>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <WhiteboardCanvas campaignId={campaignId} />
    </div>
  )
}
