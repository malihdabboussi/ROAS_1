'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  backendOptionsForHomeFeed,
  DEFAULT_HOME_FEED_SCOPE,
  homeFeedCacheScopeKey,
  type HomeFeedScopeState,
} from '@/lib/home/home-feed-scope'
import { backendPost } from '@/lib/api/backend-client'
import { cachedFetch } from '@/lib/cache/keyed-fetch-cache'
import { createClient } from '@/lib/supabase/client'
import { sanitizeUserError } from '@/lib/utils/sanitize-user-error'
import { SPACES_YOUR_TURN_TOAST_ERRORS } from '../config/spaces-toast-errors.config'
import { yourTurnService, type YourTurnItem } from '../services/your-turn.service'

const REALTIME_RELOAD_DEBOUNCE_MS = 2000

let yourTurnChannelSeq = 0

/** Deduped your-turn list fetch — concurrent callers with the same scope share one request. */
export function fetchYourTurnForScope(scope: HomeFeedScopeState): Promise<YourTurnItem[]> {
  const feedOrgId = scope.feedScope === 'org' ? (scope.orgId ?? undefined) : undefined
  const cacheKey = `your-turn:${homeFeedCacheScopeKey(scope.feedScope, scope.orgId)}:${scope.campaignId ?? ''}`
  return cachedFetch(cacheKey, () =>
    yourTurnService.list({
      limit: 200,
      feedScope: scope.feedScope,
      feedOrgId,
      campaignId: scope.campaignId ?? undefined,
      backend: backendOptionsForHomeFeed(scope.feedScope, scope.orgId),
    }),
  )
}

export function useYourTurnFeed(scope: HomeFeedScopeState = DEFAULT_HOME_FEED_SCOPE) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<YourTurnItem[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [activeSubtask, setActiveSubtask] = useState<YourTurnItem | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const rows = await fetchYourTurnForScope({
        feedScope: scope.feedScope,
        orgId: scope.orgId,
        campaignId: scope.campaignId,
      })
      setItems(rows)
    } catch {
      toast.error("Couldn't load Your Turn — try again in a moment.")
    } finally {
      setLoading(false)
    }
  }, [scope.feedScope, scope.orgId, scope.campaignId])

  useEffect(() => {
    // Session is read locally (no GoTrue round-trip, unlike auth.getUser()).
    createClient()
      .auth.getSession()
      .then(({ data }) => {
        if (data.session?.user) setUserId(data.session.user.id)
      })
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(() => {
    if (!userId) return
    const supabase = createClient()
    let reloadTimer: ReturnType<typeof setTimeout> | null = null
    // Trailing debounce so realtime event bursts collapse into one reload.
    const scheduleReload = () => {
      if (reloadTimer) clearTimeout(reloadTimer)
      reloadTimer = setTimeout(() => {
        reloadTimer = null
        void reload()
      }, REALTIME_RELOAD_DEBOUNCE_MS)
    }
    yourTurnChannelSeq += 1
    const channel = supabase
      // Unique name per subscription — multiple feed instances must not share a topic.
      .channel(`your-turn-feed-${yourTurnChannelSeq}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mission_subtasks',
          filter: `assigned_user_id=eq.${userId}`,
        },
        scheduleReload,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'space_items' },
        scheduleReload,
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'missions' },
        scheduleReload,
      )
      .subscribe()
    return () => {
      if (reloadTimer) clearTimeout(reloadTimer)
      void supabase.removeChannel(channel)
    }
  }, [userId, reload])

  const acceptSuggestion = useCallback(
    async (item: YourTurnItem) => {
      if (!item.space_id) return
      try {
        await backendPost(`/api/spaces/${item.space_id}/items/${item.id}/accept-suggestion`, {})
        toast.success('Locked in — moved to your space.')
        void reload()
      } catch (err) {
        toast.error(sanitizeUserError(err, SPACES_YOUR_TURN_TOAST_ERRORS.ACCEPT_FAILED.userMessage))
      }
    },
    [reload],
  )

  const dismissSuggestion = useCallback(
    async (item: YourTurnItem) => {
      if (!item.space_id) return
      try {
        await backendPost(`/api/spaces/${item.space_id}/items/${item.id}/dismiss-suggestion`, {})
        toast.success('Dismissed — off your plate.')
        void reload()
      } catch (err) {
        toast.error(
          sanitizeUserError(err, SPACES_YOUR_TURN_TOAST_ERRORS.DISMISS_FAILED.userMessage),
        )
      }
    },
    [reload],
  )

  const openItem = useCallback(
    (item: YourTurnItem) => {
      if (item.kind === 'mission_subtask') {
        setActiveSubtask(item)
        return
      }
      if (item.kind === 'plan_approval' && item.mission_id) {
        router.push(`/home?mission=${item.mission_id}&tab=plan`)
        return
      }
      if ((item.kind === 'space_item' || item.kind === 'suggestion') && item.space_id) {
        router.push(`/spaces?space=${item.space_id}&item=${item.id}`)
        return
      }
    },
    [router],
  )

  return {
    loading,
    items,
    activeSubtask,
    setActiveSubtask,
    reload,
    openItem,
    acceptSuggestion,
    dismissSuggestion,
  }
}
