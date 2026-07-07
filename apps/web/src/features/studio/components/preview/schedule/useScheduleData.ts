'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import {
  rasterizeSocialPostOffscreen,
  socialPostRenderDimensions,
} from '@/features/studio/lib/png-export'
import {
  fetchCampaignSchedule,
  scheduleSocialPost,
  unscheduleSocialPost,
  updateSocialPost,
  type ScheduledSocialPost,
} from '@/features/studio/services/artifact-preview.service'

interface UseScheduleDataParams {
  campaignId: string
  /**
   * When false the hook is inert: no schedule fetch and no realtime
   * subscriptions. Lets consumers that only conditionally show campaign
   * social posts (e.g. the space calendar in `space_items` mode) skip the
   * request entirely. Defaults to true so existing callers are unchanged.
   */
  enabled?: boolean
}

export function useScheduleData({ campaignId, enabled = true }: UseScheduleDataParams) {
  const [rows, setRows] = useState<ScheduledSocialPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const initialised = useRef(false)

  const load = useCallback(async () => {
    if (!campaignId || !enabled) {
      setRows([])
      setLoading(false)
      return
    }
    if (!initialised.current) setLoading(true)
    setError(null)
    try {
      const data = await fetchCampaignSchedule(campaignId)
      setRows(data)
      initialised.current = true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load schedule')
    } finally {
      setLoading(false)
    }
  }, [campaignId, enabled])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!campaignId || !enabled) return
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    const refresh = () => void load()
    const channel = supabase
      .channel(`schedule:${campaignId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'social_posts',
          filter: `campaign_id=eq.${campaignId}`,
        },
        refresh,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'social_post_schedules',
          filter: `campaign_id=eq.${campaignId}`,
        },
        refresh,
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [campaignId, enabled, load])

  const rowsRef = useRef(rows)
  rowsRef.current = rows

  const handleSchedulePost = useCallback(
    async (socialPostId: string, scheduledAtIso: string) => {
      const row = rowsRef.current.find((r) => r.id === socialPostId)
      if (row && row.post_type !== 'text_only' && row.campaign_id) {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        )
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user?.id) throw new Error('Sign in required to render post image')
        const dims = socialPostRenderDimensions(row.post_type, row.platform)
        const rasterOpts =
          row.platform === 'instagram'
            ? { format: 'jpeg' as const, quality: 0.95, backgroundColor: '#ffffff' }
            : undefined

        if (row.generated_tsx?.trim()) {
          const publicUrl = await rasterizeSocialPostOffscreen(
            row.generated_tsx,
            dims.width,
            dims.height,
            user.id,
            row.campaign_id,
            row.id,
            rasterOpts,
          )
          await updateSocialPost(row.id, { image_url: publicUrl })
        }

        const slides = row.carousel_slides ?? []
        const slidesNeedRender = slides.some((s) => s.tsx?.trim() && !s.image_url?.trim())
        if (row.post_type === 'carousel' && slides.length > 0 && slidesNeedRender) {
          const updatedSlides = [...slides.map((s) => ({ ...s }))]
          for (let i = 0; i < updatedSlides.length; i++) {
            const slide = updatedSlides[i]!
            if (slide.tsx?.trim() && !slide.image_url?.trim()) {
              const slideUrl = await rasterizeSocialPostOffscreen(
                slide.tsx,
                dims.width,
                dims.height,
                user.id,
                row.campaign_id,
                `${row.id}-slide-${i}`,
                rasterOpts,
              )
              updatedSlides[i] = { ...slide, image_url: slideUrl }
            }
          }
          await updateSocialPost(row.id, { carousel_slides: updatedSlides })
        }
      }
      await scheduleSocialPost(socialPostId, scheduledAtIso)
      await load()
    },
    [load],
  )

  const handleUnschedulePost = useCallback(
    async (socialPostId: string) => {
      await unscheduleSocialPost(socialPostId)
      await load()
    },
    [load],
  )

  return {
    rows,
    loading,
    error,
    refresh: load,
    schedulePost: handleSchedulePost,
    unschedulePost: handleUnschedulePost,
  }
}
