'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useGlobalChatStore } from '@/components/global-chat/store/use-global-chat-store'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { useSpacesStore } from '../store/use-spaces-store'
import { SpaceItemsContainer } from './SpaceItemsContainer'

export function SpacesContainer() {
  const loadSpaces = useSpacesStore((s) => s.loadSpaces)
  const loadRoster = useGlobalChatStore((s) => s.loadRoster)
  const loading = useSpacesStore((s) => s.loading)
  const spaces = useSpacesStore((s) => s.spaces)
  const activeSpaceId = useSpacesStore((s) => s.activeSpaceId)
  const ensureDefaultSpace = useSpacesStore((s) => s.ensureDefaultSpace)
  const setActiveSpace = useSpacesStore((s) => s.setActiveSpace)
  const setWorkContext = useGlobalChatStore((s) => s.setWorkContext)
  const searchParams = useSearchParams()
  const urlSpaceParam = searchParams.get('space')?.trim() || null
  const [creatingDefaultSpace, setCreatingDefaultSpace] = useState(false)

  useEffect(() => {
    loadSpaces()
    void loadRoster()
  }, [loadSpaces, loadRoster])

  const activeCampaignId = spaces.find((space) => space.id === activeSpaceId)?.campaign_id ?? null

  useEffect(() => {
    if (!activeSpaceId) return
    setWorkContext({
      surface: 'spaces',
      spaceId: activeSpaceId,
      campaignId: activeCampaignId,
    })
  }, [activeCampaignId, activeSpaceId, setWorkContext])

  useEffect(() => {
    // Deep links resolve a specific space; do not race ensure-default into a blank org.
    if (urlSpaceParam || loading || spaces.length > 0 || creatingDefaultSpace) return
    let cancelled = false
    setCreatingDefaultSpace(true)
    ensureDefaultSpace()
      .then((space) => {
        if (!cancelled) setActiveSpace(space.id)
      })
      .finally(() => {
        if (!cancelled) setCreatingDefaultSpace(false)
      })
    return () => {
      cancelled = true
    }
  }, [
    creatingDefaultSpace,
    ensureDefaultSpace,
    loading,
    setActiveSpace,
    spaces.length,
    urlSpaceParam,
  ])

  // Keep painting when we already have spaces (stale-while-revalidate).
  if ((loading && spaces.length === 0) || creatingDefaultSpace) {
    return (
      <div className="flex h-full items-center justify-center">
        <VibeyLoadingOrb state="processing" size="lg" text="Loading spaces..." />
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden p-3">
      <SpaceItemsContainer key={activeSpaceId ? 'has-space' : 'no-space'} />
    </div>
  )
}
