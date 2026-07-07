import type React from 'react'
import type {
  MissionAgent,
  MissionAgentSkill,
  MissionAgentWorkflow,
} from '@/lib/agents'
import type { Campaign } from '@/lib/campaigns'
import type { AgentInfoPanelTab } from '../../../lib/agent-info-panel-tabs'
import type { TeamCommunicationTab } from '../../../containers/TeamCommunicationTab'

export interface AgentInfoPanelProps {
  selected: MissionAgent | null
  generatingAvatarIds: Set<string>
  handleGeneratePortrait: () => Promise<void>
  editingName?: boolean
  setEditingName?: React.Dispatch<React.SetStateAction<boolean>>
  nameValue?: string
  setNameValue: React.Dispatch<React.SetStateAction<string>>
  handleNameSave: () => Promise<void>
  handleNameClick?: () => void
  statusBadgeText: string | null
  bio?: string
  blockedCount: number
  activeCount: number
  todoCount: number
  totalCompleted: number
  completedThisMonth: number
  successRate: number | null
  avgCompletionRate: number | null
  missionsScored: number
  lastActiveLabel: string | null
  level: string
  campaigns: Campaign[]
  nonGeneralCampaigns: Campaign[]
  assignedCampaigns: Campaign[]
  campaignLoading: boolean
  campaignActionLoading: boolean
  campaignError: string | null
  handleAssignCampaign: (campaignId: string) => Promise<void>
  handleUnassignCampaign: (campaignId: string) => Promise<void>
  hasStats: boolean
  overallColor: string
  overall: number
  metrics: Array<{ key: string; label: string }>
  stats: Record<string, number | string | undefined>
  isSelectedRemovable: boolean
  isSelectedManager: boolean
  isSystemLikeAgent: boolean
  setFireError: React.Dispatch<React.SetStateAction<string | null>>
  setShowFireConfirm: React.Dispatch<React.SetStateAction<boolean>>
  skillsLoading: boolean
  agentSkills: MissionAgentSkill[]
  agentWorkflows: MissionAgentWorkflow[]
  skillsError: string | null
  showUpgradeModal: boolean
  setShowUpgradeModal: React.Dispatch<React.SetStateAction<boolean>>
  handleAddBrain: () => Promise<void>
  hasBrain: boolean
  brainLoading: boolean
  brainError: string | null
  selectedAgentKey: string
  setAgents: React.Dispatch<React.SetStateAction<MissionAgent[]>>
  cLevelCount?: number
  managerCount?: number
  employeeCount?: number
  idleMembersCount?: number
  activeMembersCount?: number
  communicationTabProps: React.ComponentProps<typeof TeamCommunicationTab>
  managementDisabled?: boolean
  canAllowExtraAccess?: boolean
  canSetAgentTeam?: boolean
  onClose?: () => void
  fullScreen?: boolean
  /** Team 2 detail: panel width is controlled by the parent collapse shell. */
  fillParentWidth?: boolean
  /** Team 2 detail: collapse control replaces the status chip on card hover. */
  onRequestCollapse?: () => void
  infoPanelTab?: AgentInfoPanelTab
  onInfoPanelTabChange?: (tab: AgentInfoPanelTab) => void
}
