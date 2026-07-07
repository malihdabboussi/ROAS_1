import type { Mission, MissionDeliverable } from '@/features/mission-control/types'

export interface CampaignContext {
  purpose: string
  result: string
  strategy: string
  off_limits?: string[]
  selected_offer_ids?: string[]
  selected_avatar_ids?: string[]
}

export interface CampaignResources {
  website: string | null
  drive_folder: string | null
  x: string | null
  linkedin: string | null
  youtube: string | null
  instagram: string | null
  facebook: string | null
}

export interface CampaignMissionDeliverablesGroup {
  mission: Mission
  deliverables: MissionDeliverable[]
}
