import type { Campaign } from '@/lib/campaigns/campaign-api'

export interface TeamDerivedCounts {
  cLevelCount: number
  managerCount: number
  employeeCount: number
  activeMembersCount: number
  idleMembersCount: number
}

export interface TeamMissionCounts {
  todoCount: number
  activeCount: number
  blockedCount: number
}

export interface TeamCampaignCollections {
  campaigns: Campaign[]
  nonGeneralCampaigns: Campaign[]
  assignedCampaigns: Campaign[]
}
