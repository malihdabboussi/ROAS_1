'use client'

import { useEffect, useState } from 'react'
import {
  useAdsResearchToolbarBridgeStore,
  type AdsResearchSurface,
} from '../../store/use-ads-research-toolbar-bridge'
import type { SpaceItem } from '../../types'
import type { ViewDef } from '../../types/space-schema'
import { AdsResearchLibraryView } from './AdsResearchLibraryView'
import { AdsResearchRunsView } from './AdsResearchRunsView'

interface AdsResearchViewProps {
  view: ViewDef
  items: SpaceItem[]
  researchContext: {
    spaceId: string
    campaignId: string | null
  }
}

export function AdsResearchView({ view, items, researchContext }: AdsResearchViewProps) {
  const [surface, setSurface] = useState<AdsResearchSurface>('runs')
  const setToolbarSurface = useAdsResearchToolbarBridgeStore((state) => state.setSurface)
  const { spaceId, campaignId } = researchContext

  useEffect(() => {
    setToolbarSurface(surface)
  }, [setToolbarSurface, surface])

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="border-border px-spacing-4 py-spacing-2 flex shrink-0 items-center border-b">
        <div className="border-border bg-secondary p-spacing-1 rounded-spacing-2 flex items-center border">
          <ModeButton
            label="Research Runs"
            selected={surface === 'runs'}
            onClick={() => setSurface('runs')}
          />
          <ModeButton
            label="Library Search"
            selected={surface === 'library'}
            onClick={() => setSurface('library')}
          />
        </div>
      </div>
      {surface === 'runs' ? (
        <AdsResearchRunsView spaceId={spaceId} campaignId={campaignId} />
      ) : (
        <AdsResearchLibraryView view={view} items={items} spaceId={spaceId} />
      )}
    </div>
  )
}

function ModeButton({
  label,
  selected,
  onClick,
}: {
  label: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={`body-4 rounded-spacing-1 px-spacing-3 py-spacing-1 font-medium transition-colors ${
        selected
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground'
      }`}
      onClick={onClick}
    >
      {label}
    </button>
  )
}
