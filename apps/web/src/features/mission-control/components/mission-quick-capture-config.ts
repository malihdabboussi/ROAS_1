import type { MissionPriority } from '../types'

export type MissionQuickCaptureDropdown = 'campaign' | 'priority' | 'attach' | null
export type MissionQuickCaptureRecordingState = 'idle' | 'recording' | 'finishing'

export interface CampaignOption {
  id: string
  name: string
  icon?: string
}

export const PRIORITIES: { value: MissionPriority; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'text-blue-400' },
  { value: 'medium', label: 'Medium', color: 'text-amber-400' },
  { value: 'high', label: 'High', color: 'text-orange-400' },
  { value: 'urgent', label: 'Urgent', color: 'text-red-400' },
]
