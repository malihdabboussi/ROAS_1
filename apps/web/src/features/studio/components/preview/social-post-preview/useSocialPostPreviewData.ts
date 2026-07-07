import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import {
  fetchCampaignSchedule,
  fetchIntegrationStatus,
  fetchSocialPost,
  type ScheduledSocialPost,
} from '../../../services/artifact-preview.service'
import type { SocialPost } from '../../../types'

interface UseSocialPostPreviewDataParams {
  socialPostId: string
  onLoadStart: () => void
}

interface UseSocialPostPreviewDataResult {
  post: SocialPost | null
  setPost: Dispatch<SetStateAction<SocialPost | null>>
  loading: boolean
  error: string | null
  integrationConnected: boolean | undefined
  existingSchedules: ScheduledSocialPost[]
  refreshPost: () => Promise<SocialPost>
}

export function useSocialPostPreviewData({
  socialPostId,
  onLoadStart,
}: UseSocialPostPreviewDataParams): UseSocialPostPreviewDataResult {
  const [post, setPost] = useState<SocialPost | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [integrationConnected, setIntegrationConnected] = useState<boolean | undefined>(undefined)
  const [existingSchedules, setExistingSchedules] = useState<ScheduledSocialPost[]>([])
  const realtimeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const refreshPost = useCallback(async () => {
    const nextPost = await fetchSocialPost(socialPostId)
    setPost(nextPost)
    return nextPost
  }, [socialPostId])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    onLoadStart()
    setIntegrationConnected(undefined)
    fetchSocialPost(socialPostId)
      .then((data) => {
        if (cancelled) return
        setPost(data)
        fetchIntegrationStatus(data.platform)
          .then((status) => {
            if (!cancelled) setIntegrationConnected(status.connected)
          })
          .catch(() => {
            if (!cancelled) setIntegrationConnected(undefined)
          })
        if (data.campaign_id) {
          fetchCampaignSchedule(data.campaign_id)
            .then((rows) => {
              if (!cancelled)
                setExistingSchedules(
                  rows.filter((row) => row.id !== data.id && Boolean(row.scheduled_at)),
                )
            })
            .catch(() => {})
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [socialPostId, onLoadStart])

  useEffect(() => {
    if (!socialPostId) return
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    let cancelled = false
    const refresh = () => {
      if (realtimeDebounceRef.current) clearTimeout(realtimeDebounceRef.current)
      realtimeDebounceRef.current = setTimeout(() => {
        void fetchSocialPost(socialPostId)
          .then((data) => {
            if (!cancelled) setPost(data)
          })
          .catch(() => {})
      }, 400)
    }
    const channel = supabase
      .channel(`social-post-preview:${socialPostId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'social_posts',
          filter: `id=eq.${socialPostId}`,
        },
        refresh,
      )
      .subscribe()
    return () => {
      cancelled = true
      if (realtimeDebounceRef.current) clearTimeout(realtimeDebounceRef.current)
      void supabase.removeChannel(channel)
    }
  }, [socialPostId])

  return {
    post,
    setPost,
    loading,
    error,
    integrationConnected,
    existingSchedules,
    refreshPost,
  }
}
