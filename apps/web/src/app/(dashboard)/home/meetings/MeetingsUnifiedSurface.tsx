'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Settings2 } from 'lucide-react'
import { useMeetingsCalendarMaterialize } from '@/features/home/hooks/use-meetings-calendar-materialize'
import { rankPersonalMeetingsSpace } from '@/features/home/lib/resolve-meetings-space-id'
import { SpaceItemsContainer, useEnsureAllMeetingsColumns, useSpacesStore } from '@/features/spaces'
import { clientScopeMatchesRecord, useClientScope } from '@/lib/client-scope'
import { useWorkspaceSettingsModal } from '@/lib/settings/workspace-settings-modal-context'
import type { SpaceItem } from '@/lib/spaces'
import { getActiveOrgIdFromStorage } from '@/lib/utils/org-storage'

function findMeetingsSpaceId(spaces: ReturnType<typeof useSpacesStore.getState>['spaces']) {
  const activeOrgId = getActiveOrgIdFromStorage()
  let selectedId: string | null = null
  let selectedRank = -1
  for (const space of spaces) {
    const scopeRank = activeOrgId && space.org_id === activeOrgId ? 1_000 : space.org_id ? 100 : 0
    const rank = rankPersonalMeetingsSpace(space) + scopeRank
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
  store.setActiveView('all-meetings')
}

export function MeetingsUnifiedSurface({ agenda }: { agenda: ReactNode }) {
  const { openWorkspaceSettings } = useWorkspaceSettingsModal()
  const { scope: clientScope } = useClientScope()
  const [meetingsSpaceId, setMeetingsSpaceId] = useState<string | null>(() => {
    const spaceId = findMeetingsSpaceId(useSpacesStore.getState().spaces)
    activateMeetingsSpace(spaceId)
    return spaceId
  })
  const loadSpaces = useSpacesStore((state) => state.loadSpaces)
  const loadRoster = useSpacesStore((state) => state.loadRoster)
  const loadItems = useSpacesStore((state) => state.loadItems)
  useMeetingsCalendarMaterialize(meetingsSpaceId, loadItems)
  useEnsureAllMeetingsColumns(meetingsSpaceId)
  const itemFilter = useCallback(
    (item: SpaceItem) => (clientScope ? clientScopeMatchesRecord(clientScope, item) : true),
    [clientScope],
  )

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
          leadingViewId: 'all-meetings',
          overrideView: { id: 'agenda', content: agenda },
          defaultPinnedViewIds: ['agenda'],
          itemFilter,
          viewStripRightSlot: (
            <button
              type="button"
              className="btn-icon-bare"
              aria-label="Configure meeting integrations"
              title="Configure meeting integrations"
              onClick={() => openWorkspaceSettings('integrations')}
            >
              <Settings2 className="icon-sm" aria-hidden />
            </button>
          ),
        }}
      />
    </div>
  )
}
