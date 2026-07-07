'use client'

import type { ScheduledSocialPost } from '@/features/studio/services/artifact-preview.service'

export type ScheduleView = 'calendar' | 'table'

export type ScheduleSort =
  | 'scheduled_at.asc'
  | 'scheduled_at.desc'
  | 'platform.asc'
  | 'platform.desc'

export interface ScheduleTabData {
  rows: ScheduledSocialPost[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  schedulePost: (socialPostId: string, scheduledAtIso: string) => Promise<void>
  unschedulePost: (socialPostId: string) => Promise<void>
}
