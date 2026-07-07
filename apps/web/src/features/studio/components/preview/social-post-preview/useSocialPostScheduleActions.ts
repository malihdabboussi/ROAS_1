import { useCallback, useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import {
  rasterizeSocialPostOffscreen,
  socialPostRenderDimensions,
} from '@/features/studio/lib/png-export'
import {
  validateSocialPost,
  type ValidationResult,
} from '@/features/studio/lib/social-post-validation'
import {
  scheduleSocialPost,
  updateSocialPost,
  type ScheduledSocialPost,
} from '../../../services/artifact-preview.service'
import type { SocialPost } from '../../../types'

const EMPTY_SOCIAL_POST_VALIDATION: ValidationResult = {
  valid: true,
  errors: [],
  warnings: [],
}

function toLocalInputValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function parseLocalInputValue(value: string): Date | null {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function toStartOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function isSameScheduleDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function computeNextAvailableSlot(existingSchedules: ScheduledSocialPost[]): Date {
  const scheduledDays = new Set<string>()
  for (const schedule of existingSchedules) {
    if (!schedule.scheduled_at) continue
    const date = new Date(schedule.scheduled_at)
    scheduledDays.add(`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`)
  }

  const candidate = new Date()
  candidate.setHours(candidate.getHours() + 1, 0, 0, 0)

  for (let i = 0; i < 90; i++) {
    const key = `${candidate.getFullYear()}-${candidate.getMonth()}-${candidate.getDate()}`
    if (!scheduledDays.has(key)) return candidate
    candidate.setDate(candidate.getDate() + 1)
    candidate.setHours(10, 0, 0, 0)
  }

  return candidate
}

interface UseSocialPostScheduleActionsParams {
  post: SocialPost | null
  setPost: Dispatch<SetStateAction<SocialPost | null>>
  integrationConnected: boolean | undefined
  existingSchedules: ScheduledSocialPost[]
  setPublishErrors: Dispatch<SetStateAction<string[]>>
}

export function useSocialPostScheduleActions({
  post,
  setPost,
  integrationConnected,
  existingSchedules,
  setPublishErrors,
}: UseSocialPostScheduleActionsParams) {
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [scheduleMode, setScheduleMode] = useState<'time' | 'next'>('time')
  const [scheduleValue, setScheduleValue] = useState('')
  const [scheduleMonth, setScheduleMonth] = useState(() => toStartOfMonth(new Date()))
  const [scheduleWorking, setScheduleWorking] = useState(false)

  const validation = useMemo(() => {
    if (!post) return EMPTY_SOCIAL_POST_VALIDATION
    return validateSocialPost(post, { integrationConnected })
  }, [integrationConnected, post])

  const nextSlot = useMemo(() => computeNextAvailableSlot(existingSchedules), [existingSchedules])
  const selectedScheduleDate = parseLocalInputValue(scheduleValue)
  const scheduledOnSelectedDay = useMemo(() => {
    if (!selectedScheduleDate) return []
    return existingSchedules
      .filter((row) => {
        if (!row.scheduled_at) return false
        const scheduled = new Date(row.scheduled_at)
        if (Number.isNaN(scheduled.getTime())) return false
        return isSameScheduleDay(scheduled, selectedScheduleDate)
      })
      .sort(
        (a, b) =>
          new Date(a.scheduled_at ?? '').getTime() - new Date(b.scheduled_at ?? '').getTime(),
      )
  }, [existingSchedules, selectedScheduleDate])

  const openScheduleDialog = useCallback(() => {
    if (!post) return
    setPublishErrors([])
    const prefill = post.scheduled_at ? new Date(post.scheduled_at) : nextSlot
    setScheduleValue(toLocalInputValue(prefill))
    setScheduleMonth(toStartOfMonth(prefill))
    setScheduleMode('time')
    setScheduleOpen(true)
  }, [nextSlot, post, setPublishErrors])

  const handleScheduleDateSelect = useCallback(
    (day: Date) => {
      const previous = parseLocalInputValue(scheduleValue) ?? nextSlot
      const next = new Date(day)
      next.setHours(previous.getHours(), previous.getMinutes(), 0, 0)
      setScheduleValue(toLocalInputValue(next))
      setScheduleMonth(toStartOfMonth(next))
    },
    [nextSlot, scheduleValue],
  )

  const handleScheduleTimeChange = useCallback(
    (nextTime: string | null) => {
      const current = parseLocalInputValue(scheduleValue) ?? nextSlot
      const next = new Date(current)
      const [hRaw, mRaw] = (nextTime ?? '09:00').split(':')
      const h = Number(hRaw)
      const m = Number(mRaw ?? '0')
      if (Number.isNaN(h) || Number.isNaN(m)) return
      next.setHours(h, m, 0, 0)
      setScheduleValue(toLocalInputValue(next))
    },
    [nextSlot, scheduleValue],
  )

  const handleScheduleDateButtonClick = useCallback(() => {
    const parsed = parseLocalInputValue(scheduleValue) ?? nextSlot
    setScheduleMonth(toStartOfMonth(parsed))
  }, [nextSlot, scheduleValue])

  const handleSchedulePrevMonth = useCallback(() => {
    setScheduleMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }, [])

  const handleScheduleNextMonth = useCallback(() => {
    setScheduleMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }, [])

  const handleScheduleJumpToday = useCallback(() => {
    const today = new Date()
    setScheduleMonth(toStartOfMonth(today))
    handleScheduleDateSelect(today)
  }, [handleScheduleDateSelect])

  const handleScheduleConfirm = useCallback(async () => {
    if (!post || scheduleWorking) return
    if (validation.errors.length > 0) return
    const iso =
      scheduleMode === 'next' ? nextSlot.toISOString() : new Date(scheduleValue).toISOString()
    if (!iso || iso === 'Invalid Date') return

    setScheduleWorking(true)
    try {
      let workingPost = post
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      )
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user?.id) {
        setPublishErrors(['You must be signed in to save post images.'])
        return
      }
      if (!post.campaign_id) {
        setPublishErrors(['Social post must belong to a campaign to save images.'])
        return
      }

      const rasterOpts =
        post.platform === 'instagram'
          ? { format: 'jpeg' as const, quality: 0.95, backgroundColor: '#ffffff' }
          : undefined

      if (post.post_type === 'carousel') {
        const slides = [...(workingPost.carousel_slides ?? [])]
        const indexesNeedingRaster = slides
          .map((slide, index) => (slide?.tsx?.trim() ? index : -1))
          .filter((index) => index >= 0)

        if (indexesNeedingRaster.length > 0) {
          const dims = socialPostRenderDimensions(post.post_type, post.platform)
          for (const index of indexesNeedingRaster) {
            const tsxCode = slides[index]?.tsx?.trim()
            if (!tsxCode) continue
            const publicUrl = await rasterizeSocialPostOffscreen(
              tsxCode,
              dims.width,
              dims.height,
              user.id,
              post.campaign_id,
              `${post.id}-slide-${index}`,
              rasterOpts,
            )
            slides[index] = { ...(slides[index] ?? {}), image_url: publicUrl }
          }
        }

        const firstSlideImage =
          slides.find((slide) => Boolean(slide?.image_url?.trim()))?.image_url?.trim() ?? null

        const carouselPatch: Partial<SocialPost> = {}
        if (indexesNeedingRaster.length > 0) carouselPatch.carousel_slides = slides
        if (!workingPost.image_url?.trim() && firstSlideImage)
          carouselPatch.image_url = firstSlideImage

        if (Object.keys(carouselPatch).length > 0) {
          workingPost = await updateSocialPost(
            post.id,
            carouselPatch as Parameters<typeof updateSocialPost>[1],
          )
          setPost(workingPost)
        }
      } else {
        const needsRasterBeforeSchedule =
          post.post_type !== 'text_only' &&
          !post.image_url?.trim() &&
          !post.video_url?.trim() &&
          Boolean(post.generated_tsx?.trim())
        if (needsRasterBeforeSchedule) {
          const dims = socialPostRenderDimensions(post.post_type, post.platform)
          const publicUrl = await rasterizeSocialPostOffscreen(
            post.generated_tsx!,
            dims.width,
            dims.height,
            user.id,
            post.campaign_id,
            post.id,
            rasterOpts,
          )
          workingPost = await updateSocialPost(post.id, { image_url: publicUrl })
          setPost(workingPost)
        }
      }

      const updated = await scheduleSocialPost(workingPost.id, iso)
      setPost(updated)
      setScheduleOpen(false)
    } catch (error) {
      setPublishErrors([error instanceof Error ? error.message : String(error)])
    } finally {
      setScheduleWorking(false)
    }
  }, [
    nextSlot,
    post,
    scheduleMode,
    scheduleValue,
    scheduleWorking,
    setPost,
    setPublishErrors,
    validation,
  ])

  return {
    scheduleOpen,
    setScheduleOpen,
    scheduleMode,
    setScheduleMode,
    scheduleValue,
    scheduleMonth,
    scheduleWorking,
    validation,
    selectedScheduleDate,
    scheduledOnSelectedDay,
    nextSlot,
    openScheduleDialog,
    handleScheduleDateButtonClick,
    handleSchedulePrevMonth,
    handleScheduleNextMonth,
    handleScheduleDateSelect,
    handleScheduleJumpToday,
    handleScheduleTimeChange,
    handleScheduleConfirm,
  }
}
