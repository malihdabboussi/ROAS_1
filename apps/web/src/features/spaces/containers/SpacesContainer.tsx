'use client'

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
  const [creatingDefaultSpace, setCreatingDefaultSpace] = useState(false)

  useEffect(() => {
    loadSpaces()
    void loadRoster()
  }, [loadSpaces, loadRoster])

  useEffect(() => {
    if (!activeSpaceId) return
    const activeSpace = spaces.find((space) => space.id === activeSpaceId)
    setWorkContext({
      surface: 'spaces',
      spaceId: activeSpaceId,
      campaignId: activeSpace?.campaign_id ?? null,
    })
  }, [activeSpaceId, setWorkContext, spaces])

  useEffect(() => {
    if (loading || spaces.length > 0 || creatingDefaultSpace) return
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
  }, [creatingDefaultSpace, ensureDefaultSpace, loading, setActiveSpace, spaces.length])

  if (loading || creatingDefaultSpace) {
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
