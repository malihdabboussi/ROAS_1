'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { LayoutGrid, Star } from 'lucide-react'
import { getIconColor, LucideIcon } from '@/components/ui/IconPicker'
import { FavoriteSpacesEmptyIllustration } from '@/features/home/components/HomeEmptyIllustrations'
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
import { fetchSpacesForHomeScope } from '@/features/spaces/hooks/use-cached-spaces'
import {
  fetchSpaceUserState,
  updateSpaceUserState,
  type SpaceUserState,
} from '@/features/spaces/services/spaces.service'
import type { Space } from '@/features/spaces/types'
import { cachedFetch } from '@/lib/cache/keyed-fetch-cache'
import { cn } from '@/lib/utils/cn'

const INITIAL_ROWS = 10

function spaceIconMeta(space: Space) {
  const icon =
    typeof space.schema?.icon === 'string' && space.schema.icon.length > 0
      ? space.schema.icon
      : 'layout-grid'
  return { icon, textColor: getIconColor(space.schema?.icon_color).textColor }
}

export function FavoriteSpacesCard() {
  const router = useRouter()
  const { scope, updateScope } = usePersistedHomeFeedScope('favorite_spaces')
  const [loading, setLoading] = useState(true)
  const [spaces, setSpaces] = useState<Space[]>([])
  const [userState, setUserState] = useState<SpaceUserState[]>([])

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const [spaceRows, stateRows] = await Promise.all([
        fetchSpacesForHomeScope({
          feedScope: scope.feedScope,
          orgId: scope.orgId,
          campaignId: scope.campaignId,
        }),
        cachedFetch('spaces:user-state', fetchSpaceUserState).catch(() => [] as SpaceUserState[]),
      ])
      setSpaces(spaceRows)
      setUserState(stateRows)
    } finally {
      setLoading(false)
    }
  }, [scope.feedScope, scope.orgId, scope.campaignId])

  useEffect(() => {
    void reload()
  }, [reload])

  const favoriteIds = useMemo(
    () => new Set(userState.filter((s) => s.is_favorite).map((s) => s.space_id)),
    [userState],
  )

  const favoriteSpaces = useMemo(() => {
    const rows = spaces.filter((s) => favoriteIds.has(s.id))
    rows.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    return rows.slice(0, INITIAL_ROWS)
  }, [spaces, favoriteIds])

  const addableSpaces = useMemo(
    () => spaces.filter((s) => !favoriteIds.has(s.id)),
    [spaces, favoriteIds],
  )

  const addDropdownItems = useMemo(
    () =>
      addableSpaces.map((space) => {
        const { icon, textColor } = spaceIconMeta(space)
        return {
          id: space.id,
          label: space.title,
          icon: <LucideIcon name={icon} className={cn('h-4 w-4 shrink-0', textColor)} />,
        }
      }),
    [addableSpaces],
  )

  const toggleFavorite = useCallback(async (spaceId: string, next: boolean) => {
    setUserState((prev) => {
      const existing = prev.find((s) => s.space_id === spaceId)
      if (existing) {
        return prev.map((s) => (s.space_id === spaceId ? { ...s, is_favorite: next } : s))
      }
      return [
        ...prev,
        {
          space_id: spaceId,
          is_favorite: next,
          is_hidden: false,
          updated_at: new Date().toISOString(),
        },
      ]
    })
    await updateSpaceUserState(spaceId, { is_favorite: next })
  }, [])

  return (
    <HomeListCardShell
      icon={LayoutGrid}
      title="Favorite spaces"
      headerRight={
        <HomeFeedScopeHoverReveal>
          <div className="flex items-center gap-0.5">
            <HomeFavoriteAddDropdown
              tooltip="Add favorite space"
              ariaLabel="Add favorite space"
              emptyMessage="All spaces are already favorites."
              items={addDropdownItems}
              onPick={(spaceId) => void toggleFavorite(spaceId, true)}
            />
            <HomeFeedScopePicker variant="favorite_spaces" scope={scope} onChange={updateScope} />
          </div>
        </HomeFeedScopeHoverReveal>
      }
      loading={loading}
      emptyMessage={
        <div className="flex flex-col items-center gap-4 py-8">
          <FavoriteSpacesEmptyIllustration />
          <p className="body-3 text-muted-foreground max-w-[240px] text-center">
            Star a space to pin it here, or use + to add one.
          </p>
        </div>
      }
      hasRows={favoriteSpaces.length > 0}
    >
      <ul className="space-y-0.5">
        {favoriteSpaces.map((space) => {
          const { icon, textColor } = spaceIconMeta(space)
          return (
            <li key={space.id} className="group/row">
              <div className="hover:bg-hover-subtle body-3 text-foreground flex w-full min-w-0 items-center gap-2 rounded-md px-2.5 py-2 font-medium transition-colors">
                <button
                  type="button"
                  onClick={() => router.push(`/spaces?space=${space.id}`)}
                  className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                >
                  <LucideIcon name={icon} className={cn('h-4 w-4 shrink-0', textColor)} />
                  <span className="min-w-0 flex-1 truncate">{space.title}</span>
                </button>
                <span className="relative flex h-6 w-16 shrink-0 items-center justify-end">
                  <span className="text-muted-foreground typo-caption tabular-nums transition-all group-hover/row:scale-95 group-hover/row:opacity-0">
                    {formatHomeShortDate(new Date(space.updated_at))}
                  </span>
                  <button
                    type="button"
                    onClick={() => void toggleFavorite(space.id, false)}
                    className="text-primary hover:bg-hover-subtle absolute right-0 flex h-6 w-6 scale-90 items-center justify-center rounded-md opacity-0 transition-all group-hover/row:scale-100 group-hover/row:opacity-100"
                    aria-label="Remove from favorites"
                  >
                    <Star className="h-3.5 w-3.5 fill-current" />
                  </button>
                </span>
              </div>
            </li>
          )
        })}
      </ul>
    </HomeListCardShell>
  )
}
