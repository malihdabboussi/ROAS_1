'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { HOME_AGENDA_MESSAGES } from '@/features/home/config/home-agenda-messages.config'
import { rankPersonalMeetingsSpace } from '@/features/home/lib/resolve-meetings-space-id'
import { SpaceItemsContainer, useSpacesStore } from '@/features/spaces'

function findMeetingsSpaceId(spaces: ReturnType<typeof useSpacesStore.getState>['spaces']) {
  let selectedId: string | null = null
  let selectedRank = -1
  for (const space of spaces) {
    const rank = rankPersonalMeetingsSpace(space)
    if (rank > selectedRank) {
      selectedId = space.id
      selectedRank = rank
    }
  }
  return selectedId
}

export function MeetingsUnifiedSurface({ agenda }: { agenda: ReactNode }) {
  const [initialized, setInitialized] = useState(false)
  const [meetingsSpaceId, setMeetingsSpaceId] = useState<string | null>(null)
  const loadSpaces = useSpacesStore((state) => state.loadSpaces)
  const loadRoster = useSpacesStore((state) => state.loadRoster)

  useEffect(() => {
    let cancelled = false
    void Promise.all([loadSpaces(), loadRoster()]).then(() => {
      if (cancelled) return
      const store = useSpacesStore.getState()
      const spaceId = findMeetingsSpaceId(store.spaces)
      if (spaceId) {
        store.setActiveSpace(spaceId)
        store.setActiveView('agenda')
      }
      setMeetingsSpaceId(spaceId)
      setInitialized(true)
    })
    return () => {
      cancelled = true
    }
  }, [loadRoster, loadSpaces])

  if (!initialized) {
    return (
      <div className="flex h-full items-center justify-center">
        <VibeyLoadingOrb
          state="processing"
          size="lg"
          text={HOME_AGENDA_MESSAGES.LOADING_MEETINGS.message}
        />
      </div>
    )
  }

  if (!meetingsSpaceId) {
    return <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">{agenda}</div>
  }

  return (
    <div className="p-spacing-3 flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <SpaceItemsContainer
        embed={{
          hideBreadcrumbHeader: true,
          leadingViewId: 'agenda',
          overrideView: { id: 'agenda', content: agenda },
        }}
      />
    </div>
  )
}
