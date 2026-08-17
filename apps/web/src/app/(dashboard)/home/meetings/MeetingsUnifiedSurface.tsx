'use client'

import { useEffect, useState, type ReactNode } from 'react'
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

function activateMeetingsSpace(spaceId: string | null) {
  if (!spaceId) return
  const store = useSpacesStore.getState()
  store.setActiveSpace(spaceId)
  store.setActiveView('agenda')
}

export function MeetingsUnifiedSurface({ agenda }: { agenda: ReactNode }) {
  const [meetingsSpaceId, setMeetingsSpaceId] = useState<string | null>(() => {
    const spaceId = findMeetingsSpaceId(useSpacesStore.getState().spaces)
    activateMeetingsSpace(spaceId)
    return spaceId
  })
  const loadSpaces = useSpacesStore((state) => state.loadSpaces)
  const loadRoster = useSpacesStore((state) => state.loadRoster)

  useEffect(() => {
    let cancelled = false
    void Promise.all([loadSpaces(), loadRoster()]).then(() => {
      if (cancelled) return
      const spaceId = findMeetingsSpaceId(useSpacesStore.getState().spaces)
      activateMeetingsSpace(spaceId)
      setMeetingsSpaceId(spaceId)
    })
    return () => {
      cancelled = true
    }
  }, [loadRoster, loadSpaces])

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
