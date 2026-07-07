'use client'

import { useEffect, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import type { ArtifactsState } from '../tree/types'

interface UseArtifactsRealtimeParams {
  campaignId: string
  loadArtifacts: (silent?: boolean) => Promise<ArtifactsState | null>
}

export function useArtifactsRealtime({ campaignId, loadArtifacts }: UseArtifactsRealtimeParams) {
  const silentDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!campaignId) {
      return
    }
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    const silentRefresh = () => {
      if (silentDebounceRef.current) clearTimeout(silentDebounceRef.current)
      silentDebounceRef.current = setTimeout(() => {
        void loadArtifacts(true)
      }, 400)
    }
    const artifactTables = [
      'offers',
      'funnels',
      'sequences',
      'presentations',
      'avatars',
      'ads',
      'ad_campaigns',
      'social_posts',
      'blog_posts',
    ] as const
    let channelBuilder = supabase.channel(`artifacts:${campaignId}`)
    for (const table of artifactTables) {
      channelBuilder = channelBuilder
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
    const channel = channelBuilder
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'funnel_pages' },
        silentRefresh,
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ad_sets' }, silentRefresh)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sequence_emails' },
        silentRefresh,
      )
      .subscribe((status, err) => {
        if (status === 'CHANNEL_ERROR') console.error('[Realtime] Artifacts channel error:', err)
      })
    return () => {
      if (silentDebounceRef.current) clearTimeout(silentDebounceRef.current)
      void supabase.removeChannel(channel)
    }
  }, [campaignId, loadArtifacts])
}
