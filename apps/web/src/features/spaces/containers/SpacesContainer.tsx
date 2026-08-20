'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useGlobalChatStore } from '@/components/global-chat/store/use-global-chat-store'
import { PageSkeleton } from '@/components/ui/feedback/ListSkeleton'
import { clientOverviewHrefFromSpace } from '@/lib/spaces/page-grader-client-general-space'
import { useSpacesStore } from '../store/use-spaces-store'
import { SpaceItemsContainer } from './SpaceItemsContainer'

export function SpacesContainer() {
  const router = useRouter()
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
  const urlSpace = spaces.find((space) => space.id === urlSpaceParam) ?? null
  const clientOverviewHref = clientOverviewHrefFromSpace(urlSpace, {
    hasItem: Boolean(searchParams.get('item')),
  })

  useEffect(() => {
    loadSpaces()
    void loadRoster()
  }, [loadSpaces, loadRoster])

  useEffect(() => {
    if (clientOverviewHref) router.replace(clientOverviewHref)
  }, [clientOverviewHref, router])

  const activeCampaignId = spaces.find((space) => space.id === activeSpaceId)?.campaign_id ?? null

  useEffect(() => {
    if (!activeSpaceId || clientOverviewHref) return
    setWorkContext({
      surface: 'spaces',
      spaceId: activeSpaceId,
      campaignId: activeCampaignId,
    })
  }, [activeCampaignId, activeSpaceId, clientOverviewHref, setWorkContext])

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
  if ((loading && spaces.length === 0) || creatingDefaultSpace || clientOverviewHref) {
    return (
      <div className="h-full">
        <PageSkeleton
          label={clientOverviewHref ? 'Opening client workspace…' : 'Loading spaces...'}
        />
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden p-3">
      <SpaceItemsContainer key={activeSpaceId ? 'has-space' : 'no-space'} />
    </div>
  )
}
