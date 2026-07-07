'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { getActiveOrgIdFromStorage } from '@/lib/utils/org-storage'

export type ArtifactRealtimeTable =
  | 'funnels'
  | 'offers'
  | 'ads'
  | 'ad_campaigns'
  | 'sequences'
  | 'presentations'
  | 'avatars'
  | 'social_posts'
  | 'blog_posts'
  | 'forms'
  | 'form_responses'
  | 'emails'

interface UseArtifactRowsParams<TRow> {
  campaignId: string | null
  viewType: string
  realtimeTables: ArtifactRealtimeTable[]
  childRealtimeTables?: string[]
  fetcher: (campaignId: string) => Promise<TRow[]>
  enabled?: boolean
}

export function useArtifactRows<TRow>({
  campaignId,
  viewType,
  realtimeTables,
  childRealtimeTables = [],
  fetcher,
  enabled = true,
}: UseArtifactRowsParams<TRow>) {
  const [rows, setRows] = useState<TRow[]>([])
  const [loading, setLoading] = useState(() => Boolean(enabled && campaignId))
  const [error, setError] = useState<string | null>(null)
  const loadGenRef = useRef(0)
  const silentDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadRows = useCallback(
    async (silent?: boolean) => {
      if (!enabled || !campaignId) {
        setRows([])
        setLoading(false)
        setError(null)
        return
      }
      const gen = ++loadGenRef.current
      if (!silent) {
        setLoading(true)
        setError(null)
      }
      try {
        const nextRows = await fetcher(campaignId)
        if (gen !== loadGenRef.current) return
        setRows(nextRows)
      } catch (err) {
        if (gen !== loadGenRef.current) return
        if (!silent) {
          setRows([])
          setError(err instanceof Error ? err.message : 'Failed to load artifacts')
        }
      } finally {
        if (gen === loadGenRef.current) setLoading(false)
      }
    },
    [campaignId, enabled, fetcher],
  )

  useEffect(() => {
    void loadRows()
  }, [loadRows])

  useEffect(() => {
    if (!enabled || !campaignId) return
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    const silentRefresh = () => {
      if (silentDebounceRef.current) clearTimeout(silentDebounceRef.current)
      silentDebounceRef.current = setTimeout(() => {
        void loadRows(true)
      }, 400)
    }

    let channel = supabase.channel(`artifacts:${campaignId}:${viewType}`)
    for (const table of realtimeTables) {
      channel = channel
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table, filter: `campaign_id=eq.${campaignId}` },
          silentRefresh,
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table, filter: `campaign_id=eq.${campaignId}` },
          silentRefresh,
        )
        .on(
          'postgres_changes',
          { event: 'DELETE', schema: 'public', table, filter: `campaign_id=eq.${campaignId}` },
          silentRefresh,
        )
    }
    // Child tables (funnel_pages, sequence_emails, ad_sets) have no campaign_id
    // column — scope by org so changes in other orgs' campaigns don't replay the
    // whole fetch cascade. Personal context (no org) falls back to unfiltered,
    // where RLS already limits events to the user's own rows.
    const activeOrgId = getActiveOrgIdFromStorage()
    for (const table of childRealtimeTables) {
      channel = channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          ...(activeOrgId ? { filter: `org_id=eq.${activeOrgId}` } : {}),
        },
        silentRefresh,
      )
    }
    const subscribed = channel.subscribe((status, err) => {
      if (status === 'CHANNEL_ERROR') {
        console.error(`[Realtime] ${viewType} channel error:`, err)
      }
    })
    return () => {
      if (silentDebounceRef.current) clearTimeout(silentDebounceRef.current)
      void supabase.removeChannel(subscribed)
    }
  }, [campaignId, childRealtimeTables, enabled, loadRows, realtimeTables, viewType])

  return { rows, loading, error, refresh: loadRows }
}
