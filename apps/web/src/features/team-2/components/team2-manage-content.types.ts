import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import type { AgentChannel, AgentStats, FireEmployeeHandoffInput, MissionAgent } from '@/lib/agents'
import type { ModelStrategyId } from '@/lib/agents/model-strategies'
import type { Mission } from '@/lib/missions'

export interface Team2ManageData {
  agents: MissionAgent[]
  selected: MissionAgent | null
  selectedAgentKey: string
  generatingAvatarIds: Set<string>
  editingName: boolean
  setEditingName: (value: boolean) => void
  nameValue: string
  setNameValue: (value: string) => void
  campaigns: unknown[]
  nonGeneralCampaigns: unknown[]
  assignedCampaigns: Array<{ id: string; name: string }>
  campaignLoading: boolean
  campaignActionLoading: boolean
  campaignError: string | null
  skillsLoading: boolean
  agentSkills: Array<{ name: string }>
  agentWorkflows: Array<{ name: string }>
  skillsError: string | null
  showUpgradeModal: boolean
  setShowUpgradeModal: (value: boolean) => void
  hasBrain: boolean
  brainLoading: boolean
  brainError: string | null
  selectedModelId: string
  modelOptions: ReadonlyArray<{ id: string; label: string }>
  communicationSaving: boolean
  communicationError: string | null
  modelDropdownOpen: boolean
  setModelDropdownOpen: (value: boolean) => void
  modelDropdownRef: MutableRefObject<HTMLDivElement | null>
  modelDropdownBtnRef: MutableRefObject<HTMLButtonElement | null>
  modelDropdownPos: { top: number; left: number; width: number }
  channelsLoading: boolean
  channels: AgentChannel[]
  setChannels: Dispatch<SetStateAction<AgentChannel[]>>
  channelDisconnecting: boolean
  setChannelDisconnecting: (value: boolean) => void
  slackDisconnecting: boolean
  setSlackDisconnecting: (value: boolean) => void
  setShowTelegramSetup: (value: boolean) => void
  setShowSlackSetup: (value: boolean) => void
  preferredChannel: 'studio' | 'telegram' | 'slack'
  setPreferredChannel: (value: 'studio' | 'telegram' | 'slack') => void
  channelSaving: boolean
  setChannelSaving: (value: boolean) => void
  digestEnabled: boolean
  setDigestEnabled: (value: boolean) => void
  digestSaving: boolean
  setDigestSaving: (value: boolean) => void
  digestTime: string
  setDigestTime: (value: string) => void
  digestDropdownOpen: boolean
  setDigestDropdownOpen: (value: boolean) => void
  digestDropdownBtnRef: MutableRefObject<HTMLButtonElement | null>
  digestDropdownPos: { top: number; left: number; width: number }
  userPublicSlug: string | null
  setUserPublicSlug: (value: string | null) => void
  setAgents: Dispatch<SetStateAction<MissionAgent[]>>
  generalCampaignId?: string
  hireFilterParam: string | null
  hireFilterRef: MutableRefObject<string | null>
  showReadyEmployees: boolean
  setShowReadyEmployees: (value: boolean) => void
  showTelegramSetup: boolean
  showSlackSetup: boolean
  showFireConfirm: boolean
  setShowFireConfirm: (value: boolean) => void
  checkoutLoading: boolean
  firingEmployee: boolean
  fireError: string | null
  setFireError: (value: string | null) => void
  fireBrainTotal: number | null
  fireBrainLoading: boolean
  fireHandoff: FireEmployeeHandoffInput | null
  setFireHandoff: (value: FireEmployeeHandoffInput | null) => void
  loadAgents: (selectAgentKey?: string) => Promise<void>
  loadChannels: () => Promise<void>
  missions: Mission[]
}

export interface Team2ManageDerived {
  statusBadgeText: string | null | undefined
  bio: string | null | undefined
  blockedCount: number
  activeCount: number
  todoCount: number
  totalCompleted: number
  completedThisMonth: number
  successRate: number | null
  avgCompletionRate: number | null
  missionsScored: number
  lastActiveLabel: string | null | undefined
  level: string
  hasStats: boolean
  overallColor: string
  overall: number
  metrics: Array<{ key: string; label: string }>
  stats: AgentStats
  isSelectedRemovable: boolean
  isSelectedManager: boolean
  isSystemLikeAgent: boolean
  cLevelCount: number
  managerCount: number
  employeeCount: number
  idleMembersCount: number
  activeMembersCount: number
}

export interface Team2ManageHandlers {
  handleGeneratePortrait: () => Promise<void>
  handleNameSave: () => Promise<void>
  handleNameClick: () => void
  handleAssignCampaign: (campaignId: string) => Promise<void>
  handleUnassignCampaign: (campaignId: string) => Promise<void>
  handleAddBrain: () => Promise<void>
  handleFireEmployee: () => Promise<void>
  handleCommunicationStrategyChange: (strategyId: ModelStrategyId) => Promise<void>
  handleCommunicationModelChange: (nextModelId: string) => Promise<void>
  handleVoiceChange: (voiceName: string | null) => Promise<void>
  handleCommunicationStyleChange: (style: string) => Promise<void>
}
