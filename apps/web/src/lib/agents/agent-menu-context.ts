import type { Campaign } from '@/lib/campaigns'

export interface AgentMenuActions {
  onCopyId: () => void
  onOpenInNewTab: () => void
  onOpenChat: () => void
  onOpenEdit: () => void
  onOpenSkills: () => void
  onOpenComms: () => void
  onOpenAccess: () => void
  onOpenBrain: () => void
  onSetupBrain: () => void
  onDeactivate: () => void
  onFire: () => void
  onAssignmentsChanged?: () => void | Promise<void>
}

export type AgentTeamOption = { id: string; name: string }

export type AgentMenuContext = {
  menuActions: AgentMenuActions
  nonGeneralCampaigns: Campaign[]
  teams: AgentTeamOption[]
  onSelectTeam: (agentKey: string, teamId: string | null) => Promise<void>
  isFavorite: boolean
  onToggleFavorite: () => void | Promise<void>
  canFavorite: boolean
  showAccess: boolean
  hasBrain: boolean
  fireLabel: string
  isSystemLikeAgent: boolean
  canRename: boolean
  canDeactivate: boolean
  canMoveTeam: boolean
  canFireAgent: boolean
  canManageCampaigns: boolean
}
