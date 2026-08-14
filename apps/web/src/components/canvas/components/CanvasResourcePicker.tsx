'use client'

import { useEffect, useMemo, useState } from 'react'
import { Boxes, X } from 'lucide-react'
import {
  fetchCampaignAssetSummary,
  type CampaignAssetSummary,
} from '@/features/studio/services/campaign.service'
import { CANVAS_VIEW_MESSAGES } from '../canvas-view.messages.config'

export interface CanvasResourceSelection {
  id: string
  title: string
  type: keyof CampaignAssetSummary
}

interface CanvasResourcePickerProps {
  campaignId: string
  onClose: () => void
  onSelect: (resource: CanvasResourceSelection) => void
}

const RESOURCE_LABELS: Record<keyof CampaignAssetSummary, string> = {
  offers: 'Offers',
  funnels: 'Funnels',
  ads: 'Ads',
  sequences: 'Emails & sequences',
  presentations: 'Presentations',
  avatars: 'Avatars',
}

export function CanvasResourcePicker({ campaignId, onClose, onSelect }: CanvasResourcePickerProps) {
  const [summary, setSummary] = useState<CampaignAssetSummary | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let active = true
    void fetchCampaignAssetSummary(campaignId)
      .then((next) => active && setSummary(next))
      .catch(() => active && setFailed(true))
    return () => {
      active = false
    }
  }, [campaignId])

  const groups = useMemo(
    () =>
      summary
        ? (Object.keys(RESOURCE_LABELS) as Array<keyof CampaignAssetSummary>)
            .map((type) => ({ type, resources: summary[type] }))
            .filter((group) => group.resources.length > 0)
        : [],
    [summary],
  )

  return (
    <aside className="surface-card border-border bottom-spacing-3 right-spacing-3 top-spacing-3 rounded-spacing-3 absolute z-30 flex w-96 flex-col overflow-hidden border shadow-xl">
      <header className="border-border gap-spacing-2 px-spacing-3 py-spacing-2 flex items-center border-b">
        <span className="badge-glass-blue rounded-spacing-2 flex h-8 w-8 items-center justify-center">
          <Boxes className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="body-2 text-foreground font-medium">Add campaign resource</p>
          <p className="body-4 text-muted-foreground">Place a live ROAS object on this Canvas</p>
        </div>
        <button
          type="button"
          className="button-ghost flex h-8 w-8 items-center justify-center"
          onClick={onClose}
          aria-label="Close resource library"
        >
          <X className="h-4 w-4" />
        </button>
      </header>
      <div className="p-spacing-3 min-h-0 flex-1 overflow-y-auto">
        {!summary ? (
          <p className="body-3 text-muted-foreground text-center">
            {failed
              ? CANVAS_VIEW_MESSAGES.resourcesUnavailable
              : CANVAS_VIEW_MESSAGES.resourcesLoading}
          </p>
        ) : groups.length === 0 ? (
          <p className="body-3 text-muted-foreground text-center">No campaign resources yet.</p>
        ) : (
          groups.map((group) => (
            <section key={group.type} className="mb-spacing-4">
              <h3 className="body-4 text-muted-foreground mb-spacing-2 font-semibold uppercase">
                {RESOURCE_LABELS[group.type]}
              </h3>
              <div className="gap-spacing-1 flex flex-col">
                {group.resources.map((resource) => (
                  <button
                    key={resource.id}
                    type="button"
                    className="button-glass-neutral body-3 w-full justify-start text-left"
                    onClick={() =>
                      onSelect({ id: resource.id, title: resource.name, type: group.type })
                    }
                  >
                    {resource.name}
                  </button>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </aside>
  )
}
