'use client'

import { Megaphone } from 'lucide-react'

/**
 * Empty state for views that only work inside a campaign space
 * (contacts, missions, reporting). Mirrors the docs-view empty-state pattern
 * instead of a bare sentence.
 */
export function SpaceNeedsCampaignState({ viewLabel }: { viewLabel: string }) {
  return (
    <div className="gap-spacing-3 flex flex-1 flex-col items-center justify-center p-8 text-center">
      <span className="bg-secondary flex h-12 w-12 items-center justify-center rounded-full">
        <Megaphone className="text-muted-foreground h-5 w-5" />
      </span>
      <div className="gap-spacing-1 flex flex-col">
        <p className="body-2 text-foreground font-medium">{viewLabel} needs a campaign</p>
        <p className="body-3 text-muted-foreground max-w-sm">
          This space is not linked to a campaign yet. Use the space menu → Move to campaign, then
          come back here.
        </p>
      </div>
    </div>
  )
}
