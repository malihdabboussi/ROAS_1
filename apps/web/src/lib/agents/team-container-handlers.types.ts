import type { Dispatch, MutableRefObject, SetStateAction, WheelEvent } from 'react'
import type { Campaign } from '@/lib/campaigns'
import type { FireEmployeeHandoffInput } from './agent-fire-handoff'
import type { ModelStrategyId } from './model-strategies'
import type { MissionAgent } from './mission-agents-api'

export type TeamContainerHandlersData = {
  selectedAgentKey: string
  selected: MissionAgent | null
  agents: MissionAgent[]
  nonGeneralCampaigns: Campaign[]
  nameValue: string
  generatingAvatarIds: Set<string>
  fireBrainTotal: number | null
  fireHandoff: FireEmployeeHandoffInput | null
  carouselRef: MutableRefObject<HTMLDivElement | null>
  beginTeamSessionUrlDismiss: () => void
  loadAgents: (selectAgentKey?: string) => Promise<void>
  setAgentInfoOpen: Dispatch<SetStateAction<boolean>>
  setAgents: Dispatch<SetStateAction<MissionAgent[]>>
  setAssignedCampaigns: Dispatch<SetStateAction<Campaign[]>>
  setBrainError: Dispatch<SetStateAction<string | null>>
  setCampaignActionLoading: Dispatch<SetStateAction<boolean>>
  setCampaignError: Dispatch<SetStateAction<string | null>>
  setCampaignPanelOpen: Dispatch<SetStateAction<boolean>>
  setCheckoutLoading: Dispatch<SetStateAction<boolean>>
  setCommunicationError: Dispatch<SetStateAction<string | null>>
  setCommunicationSaving: Dispatch<SetStateAction<boolean>>
  setEditingName: Dispatch<SetStateAction<boolean>>
  setFireError: Dispatch<SetStateAction<string | null>>
  setFiringEmployee: Dispatch<SetStateAction<boolean>>
  setGeneratingAvatarIds: Dispatch<SetStateAction<Set<string>>>
  setHasBrain: Dispatch<SetStateAction<boolean>>
  setModelDropdownOpen: Dispatch<SetStateAction<boolean>>
  setNameValue: Dispatch<SetStateAction<string>>
  setSelectedId: Dispatch<SetStateAction<string | null>>
  setSelectedSessionId: Dispatch<SetStateAction<string | null>>
  setShowFireConfirm: Dispatch<SetStateAction<boolean>>
  setShowUpgradeModal: Dispatch<SetStateAction<boolean>>
  syncTeamQuery: (agentKey: string | null, sessionId: string | null) => void
}

export type TeamContainerHandlers = {
  handleCommunicationModelChange: (nextModelId: string) => Promise<void>
  handleCommunicationStrategyChange: (strategyId: ModelStrategyId) => Promise<void>
  handleVoiceChange: (voiceName: string | null) => Promise<void>
  handleCommunicationStyleChange: (style: string) => Promise<void>
  handleAddBrain: () => Promise<void>
  handleRename: (agentKey: string, newName: string) => Promise<void>
  handleNameSave: () => Promise<void>
  handleNameClick: () => void
  handleGeneratePortrait: () => Promise<void>
  handleAssignCampaign: (campaignId: string) => Promise<void>
  handleUnassignCampaign: (campaignId: string) => Promise<void>
  refreshAssignmentsForAgent: (agentKey: string) => Promise<void>
  handleFireEmployee: () => Promise<void>
  scrollCarouselBy: (delta: { left?: number; top?: number }) => void
  handleCarouselWheel: (event: WheelEvent<HTMLDivElement>) => void
  handleSessionChange: (nextSessionId: string | null) => void
  handleNavigateToConversation: (params: {
    conversationId: string
    messageId?: string
    agentKey: string
  }) => void
}
