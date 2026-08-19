'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronRight, FolderKanban, Star } from 'lucide-react'
import { getIconColor, LucideIcon } from '@/components/ui/IconPicker'
import { FavoriteCampaignsEmptyIllustration } from '@/features/home/components/HomeEmptyIllustrations'
import { HomeFavoriteAddDropdown } from '@/features/home/components/HomeFavoriteAddDropdown'
import {
  HomeFeedScopeHoverReveal,
  HomeFeedScopePicker,
  usePersistedHomeFeedScope,
} from '@/features/home/components/HomeFeedScopePicker'
import {
  formatHomeShortDate,
  HomeListCardShell,
} from '@/features/home/components/HomeListCardShell'
import {
  backendOptionsForHomeFeed,
  homeFeedCacheScopeKey,
} from '@/features/home/types/home-feed-scope'
import { fetchSpacesForHomeScope } from '@/features/spaces/hooks/use-cached-spaces'
import type { Space } from '@/features/spaces/types'
import {
  campaignListCacheKey,
  fetchCampaigns,
  fetchCampaignUserState,
  updateCampaignUserState,
  type CampaignUserState,
  type Campaign,
} from '@/lib/campaigns/campaign-api'
import { fetchConversations } from '@/lib/conversations/conversations-api'
import type { Conversation } from '@/lib/conversations/conversation.types'
import { cachedFetch } from '@/lib/cache/keyed-fetch-cache'
import { cn } from '@/lib/utils/cn'

function campaignIconName(campaign: Campaign): string {
  return (
    ((campaign.config as Record<string, unknown> | undefined)?.icon as string) ?? 'folder-kanban'
  )
}

function campaignIconColorId(campaign: Campaign): string {
  return (
    ((campaign.config as Record<string, unknown> | undefined)?.icon_color as string | undefined) ??
    'default'
  )
}

function spaceIconMeta(space: Space) {
  const icon =
    typeof space.schema?.icon === 'string' && space.schema.icon.length > 0
      ? space.schema.icon
      : 'layout-grid'
  return { icon, textColor: getIconColor(space.schema?.icon_color).textColor }
}

function maxActivityDate(...isoDates: (string | null | undefined)[]): Date | null {
  let maxMs: number | null = null
  for (const iso of isoDates) {
    if (!iso) continue
    const ms = new Date(iso).getTime()
    if (Number.isNaN(ms)) continue
    if (maxMs === null || ms > maxMs) maxMs = ms
  }
  return maxMs === null ? null : new Date(maxMs)
}

function campaignLastActivityAt(
  campaign: Campaign,
  spaces: Space[],
  conversations: Conversation[],
): Date {
  const spaceDates = spaces
    .filter((space) => space.campaign_id === campaign.id)
    .map((space) => space.updated_at)
  const conversationDates = conversations
    .filter((conversation) => conversation.campaign_id === campaign.id)
    .map((conversation) => conversation.updated_at)

  return (
    maxActivityDate(campaign.updated_at, ...spaceDates, ...conversationDates) ??
    new Date(campaign.updated_at)
  )
}

export function FavoriteCampaignsCard() {
  const router = useRouter()
  const { scope, updateScope } = usePersistedHomeFeedScope('favorite_campaigns')
  const [loading, setLoading] = useState(true)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [spaces, setSpaces] = useState<Space[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [userState, setUserState] = useState<CampaignUserState[]>([])
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set())

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const backend = backendOptionsForHomeFeed(scope.feedScope, scope.orgId)
      const scopeCacheKey = homeFeedCacheScopeKey(scope.feedScope, scope.orgId)
      const campaignsKey =
        scope.feedScope === 'workspace'
          ? campaignListCacheKey()
          : `campaigns:list:${scopeCacheKey}`
      const [campaignRows, spaceRows, conversationRows, stateRows] = await Promise.all([
        cachedFetch(campaignsKey, () => fetchCampaigns(backend), { ttlMs: 60_000 }),
        fetchSpacesForHomeScope({
          feedScope: scope.feedScope,
          orgId: scope.orgId,
          campaignId: null,
        }),
        cachedFetch(`home:conversations:${scopeCacheKey}:`, () =>
          fetchConversations(
            null,
            null,
            null,
            { feedScope: scope.feedScope, feedOrgId: scope.orgId },
            backend,
          ),
        ).catch(() => [] as Conversation[]),
        cachedFetch('campaigns:user-state', fetchCampaignUserState).catch(
          () => [] as CampaignUserState[],
        ),
      ])
      setCampaigns(campaignRows)
      setSpaces(spaceRows)
      setConversations(conversationRows)
      setUserState(stateRows)
    } finally {
      setLoading(false)
    }
  }, [scope.feedScope, scope.orgId])

  useEffect(() => {
    void reload()
  }, [reload])

  const favoriteIds = useMemo(
    () => new Set(userState.filter((s) => s.is_favorite).map((s) => s.campaign_id)),
    [userState],
  )

  const favoriteCampaigns = useMemo(() => {
    const rows = campaigns.filter((c) => favoriteIds.has(c.id))
    rows.sort(
      (a, b) =>
        campaignLastActivityAt(b, spaces, conversations).getTime() -
        campaignLastActivityAt(a, spaces, conversations).getTime(),
    )
    return rows
  }, [campaigns, favoriteIds, spaces, conversations])

  const addableCampaigns = useMemo(
    () => campaigns.filter((c) => !favoriteIds.has(c.id)),
    [campaigns, favoriteIds],
  )

  const addDropdownItems = useMemo(
    () =>
      addableCampaigns.map((campaign) => {
        const iconName = campaignIconName(campaign)
        const iconColor = getIconColor(campaignIconColorId(campaign)).textColor
        return {
          id: campaign.id,
          label: campaign.name ?? 'Untitled',
          icon: <LucideIcon name={iconName} className={cn('h-4 w-4 shrink-0', iconColor)} />,
        }
      }),
    [addableCampaigns],
  )

  const toggleFavorite = useCallback(async (campaignId: string, next: boolean) => {
    setUserState((prev) => {
      const existing = prev.find((s) => s.campaign_id === campaignId)
      if (existing) {
        return prev.map((s) => (s.campaign_id === campaignId ? { ...s, is_favorite: next } : s))
      }
      return [
        ...prev,
        {
          campaign_id: campaignId,
          is_favorite: next,
          is_hidden: false,
          updated_at: new Date().toISOString(),
        },
      ]
    })
    await updateCampaignUserState(campaignId, { is_favorite: next })
  }, [])

  const spacesByCampaignId = useMemo(() => {
    const map = new Map<string, Space[]>()
    for (const space of spaces) {
      if (!space.campaign_id) continue
      const list = map.get(space.campaign_id) ?? []
      list.push(space)
      map.set(space.campaign_id, list)
    }
    for (const list of map.values()) {
      list.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    }
    return map
  }, [spaces])

  const toggleExpanded = useCallback((campaignId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(campaignId)) next.delete(campaignId)
      else next.add(campaignId)
      return next
    })
  }, [])

  const unstar = useCallback(async (campaignId: string) => {
    setUserState((prev) =>
      prev.map((s) => (s.campaign_id === campaignId ? { ...s, is_favorite: false } : s)),
    )
    setExpandedIds((prev) => {
      const next = new Set(prev)
      next.delete(campaignId)
      return next
    })
    await updateCampaignUserState(campaignId, { is_favorite: false })
  }, [])

  return (
    <HomeListCardShell
      icon={FolderKanban}
      title="Favorite campaigns"
      headerRight={
        <HomeFeedScopeHoverReveal>
          <div className="flex items-center gap-0.5">
            <HomeFavoriteAddDropdown
              tooltip="Add favorite campaign"
              ariaLabel="Add favorite campaign"
              emptyMessage="All campaigns are already favorites."
              items={addDropdownItems}
              onPick={(campaignId) => void toggleFavorite(campaignId, true)}
            />
            <HomeFeedScopePicker
              variant="favorite_campaigns"
              scope={scope}
              onChange={updateScope}
            />
          </div>
        </HomeFeedScopeHoverReveal>
      }
      loading={loading}
      emptyMessage={
        <div className="flex flex-col items-center gap-4 py-8">
          <FavoriteCampaignsEmptyIllustration />
          <p className="body-3 text-muted-foreground max-w-[240px] text-center">
            Star a campaign to pin it here, or use + to add one.
          </p>
        </div>
      }
      hasRows={favoriteCampaigns.length > 0}
    >
      <ul className="space-y-0.5">
        {favoriteCampaigns.map((campaign) => {
          const iconName = campaignIconName(campaign)
          const iconColor = getIconColor(campaignIconColorId(campaign)).textColor
          const isExpanded = expandedIds.has(campaign.id)
          const campaignSpaces = spacesByCampaignId.get(campaign.id) ?? []
          const lastActivityAt = campaignLastActivityAt(campaign, spaces, conversations)

          return (
            <li key={campaign.id}>
              <div className="group/campaign hover:bg-hover-subtle body-3 text-foreground flex w-full min-w-0 items-center gap-2 rounded-md px-2.5 py-2 font-medium transition-colors">
                <div className="relative flex h-6 w-6 shrink-0 items-center justify-center">
                  <div className="flex h-full w-full items-center justify-center transition-opacity group-hover/campaign:pointer-events-none group-hover/campaign:opacity-0">
                    <LucideIcon name={iconName} className={cn('h-4 w-4 shrink-0', iconColor)} />
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleExpanded(campaign.id)}
                    className="text-muted-foreground hover:text-foreground pointer-events-none absolute inset-0 flex items-center justify-center rounded opacity-0 transition-opacity group-hover/campaign:pointer-events-auto group-hover/campaign:opacity-100"
                    aria-expanded={isExpanded}
                    aria-label={isExpanded ? 'Collapse campaign spaces' : 'Expand campaign spaces'}
                  >
                    <ChevronRight
                      className={cn(
                        'h-4 w-4 shrink-0 transition-transform duration-150',
                        isExpanded && 'rotate-90',
                      )}
                    />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => toggleExpanded(campaign.id)}
                  className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                >
                  <span className="min-w-0 flex-1 truncate" title={campaign.name ?? 'Untitled'}>{campaign.name ?? 'Untitled'}</span>
                </button>
                <span className="relative flex h-6 w-16 shrink-0 items-center justify-end">
                  <span className="text-muted-foreground typo-caption tabular-nums transition-all group-hover/campaign:scale-95 group-hover/campaign:opacity-0">
                    {formatHomeShortDate(lastActivityAt)}
                  </span>
                  <button
                    type="button"
                    onClick={() => void unstar(campaign.id)}
                    className="text-primary hover:bg-hover-subtle absolute right-0 flex h-6 w-6 scale-90 items-center justify-center rounded-md opacity-0 transition-all group-hover/campaign:scale-100 group-hover/campaign:opacity-100"
                    aria-label="Remove from favorites"
                  >
                    <Star className="h-3.5 w-3.5 fill-current" />
                  </button>
                </span>
              </div>
              {isExpanded ? (
                campaignSpaces.length > 0 ? (
                  <ul className="border-border ml-3 space-y-0.5 border-l pl-3">
                    {campaignSpaces.map((space) => {
                      const { icon, textColor } = spaceIconMeta(space)
                      return (
                        <li key={space.id}>
                          <button
                            type="button"
                            onClick={() => router.push(`/spaces?space=${space.id}`)}
                            className="hover:bg-hover-subtle body-4 text-muted-foreground hover:text-foreground flex w-full min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors"
                          >
                            <LucideIcon
                              name={icon}
                              className={cn('h-3.5 w-3.5 shrink-0', textColor)}
                            />
                            <span className="min-w-0 flex-1 truncate" title={space.title}>{space.title}</span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                ) : (
                  <p className="body-4 text-muted-foreground ml-9 px-2 py-1">
                    No spaces in this campaign.
                  </p>
                )
              ) : null}
            </li>
          )
        })}
      </ul>
    </HomeListCardShell>
  )
}
