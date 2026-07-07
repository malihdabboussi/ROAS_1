'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useRef, useState } from 'react'
import { useOrgStore } from '@/lib/org'
import { useTeamContainerBrainSkillsData } from './use-team-container-brain-skills-data'
import { useTeamContainerCampaignData } from './use-team-container-campaign-data'
import { useTeamContainerCommunicationData } from './use-team-container-communication-data'
import { useTeamContainerFireData } from './use-team-container-fire-data'
import { useTeamContainerRoster } from './use-team-container-roster'
import { useTeamContainerRouteEffects } from './use-team-container-route-effects'

export function useTeamContainerData() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeOrgId = useOrgStore((state) => state.activeOrgId)

  const selectedAgentKeyFromUrl = searchParams.get('agent')
  const selectedSessionIdFromUrl = searchParams.get('session')
  const hireParam = searchParams.get('hire')
  const hireFilterParam = searchParams.get('hireFilter')
  const injectAwarenessParam = searchParams.get('inject_awareness')
  const promptParam = searchParams.get('prompt')

  const roster = useTeamContainerRoster({
    activeOrgId,
    pathname,
    router,
    searchParams,
    selectedAgentKeyFromUrl,
    selectedSessionIdFromUrl,
  })
  const campaigns = useTeamContainerCampaignData(roster.selectedAgentKey, activeOrgId)
  const brainSkills = useTeamContainerBrainSkillsData(roster.selectedAgentKey)
  const communication = useTeamContainerCommunicationData(roster.selected)
  const fire = useTeamContainerFireData(roster.selected)

  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState('')
  const [generatingAvatarIds, setGeneratingAvatarIds] = useState<Set<string>>(new Set())

  const roleLabelRefs = useRef<Record<string, HTMLSpanElement | null>>({})
  const carouselRef = useRef<HTMLDivElement>(null)
  const hireFilterRef = useRef<string | null>(null)

  useTeamContainerRouteEffects({
    agents: roster.agents,
    hireFilterParam,
    hireFilterRef,
    hireParam,
    injectAwarenessParam,
    loading: roster.loading,
    pathname,
    promptParam,
    router,
    searchParamsRef: roster.searchParamsRef,
    selectedAgentKeyFromUrl,
    setSelectedId: roster.setSelectedId,
    setSelectedSessionId: roster.setSelectedSessionId,
    setShowReadyEmployees: communication.setShowReadyEmployees,
  })

  return {
    agents: roster.agents,
    setAgents: roster.setAgents,
    loading: roster.loading,
    selectedId: roster.selectedId,
    setSelectedId: roster.setSelectedId,
    selectedSessionId: roster.selectedSessionId,
    setSelectedSessionId: roster.setSelectedSessionId,
    beginTeamSessionUrlDismiss: roster.beginTeamSessionUrlDismiss,
    selectedSessionTitle: roster.selectedSessionTitle,
    hasBrain: brainSkills.hasBrain,
    setHasBrain: brainSkills.setHasBrain,
    brainLoading: brainSkills.brainLoading,
    showUpgradeModal: brainSkills.showUpgradeModal,
    setShowUpgradeModal: brainSkills.setShowUpgradeModal,
    checkoutLoading: brainSkills.checkoutLoading,
    setCheckoutLoading: brainSkills.setCheckoutLoading,
    brainError: brainSkills.brainError,
    setBrainError: brainSkills.setBrainError,
    editingName,
    setEditingName,
    nameValue,
    setNameValue,
    missions: roster.missions,
    agentSkills: brainSkills.agentSkills,
    agentWorkflows: brainSkills.agentWorkflows,
    skillsLoading: brainSkills.skillsLoading,
    skillsError: brainSkills.skillsError,
    modelOptions: communication.modelOptions,
    communicationSaving: communication.communicationSaving,
    setCommunicationSaving: communication.setCommunicationSaving,
    communicationError: communication.communicationError,
    setCommunicationError: communication.setCommunicationError,
    modelDropdownOpen: communication.modelDropdownOpen,
    setModelDropdownOpen: communication.setModelDropdownOpen,
    channels: communication.channels,
    setChannels: communication.setChannels,
    channelsLoading: communication.channelsLoading,
    showTelegramSetup: communication.showTelegramSetup,
    setShowTelegramSetup: communication.setShowTelegramSetup,
    showSlackSetup: communication.showSlackSetup,
    setShowSlackSetup: communication.setShowSlackSetup,
    showReadyEmployees: communication.showReadyEmployees,
    setShowReadyEmployees: communication.setShowReadyEmployees,
    channelDisconnecting: communication.channelDisconnecting,
    setChannelDisconnecting: communication.setChannelDisconnecting,
    slackDisconnecting: communication.slackDisconnecting,
    setSlackDisconnecting: communication.setSlackDisconnecting,
    generatingAvatarIds,
    setGeneratingAvatarIds,
    mobileTeamView: roster.mobileTeamView,
    setMobileTeamView: roster.setMobileTeamView,
    isMobile: roster.isMobile,
    campaigns: campaigns.campaigns,
    assignedCampaigns: campaigns.assignedCampaigns,
    setAssignedCampaigns: campaigns.setAssignedCampaigns,
    campaignLoading: campaigns.campaignLoading,
    campaignActionLoading: campaigns.campaignActionLoading,
    setCampaignActionLoading: campaigns.setCampaignActionLoading,
    campaignError: campaigns.campaignError,
    setCampaignError: campaigns.setCampaignError,
    dragAgentId: campaigns.dragAgentId,
    setDragAgentId: campaigns.setDragAgentId,
    dragOverAgentId: campaigns.dragOverAgentId,
    setDragOverAgentId: campaigns.setDragOverAgentId,
    showFireConfirm: fire.showFireConfirm,
    setShowFireConfirm: fire.setShowFireConfirm,
    firingEmployee: fire.firingEmployee,
    setFiringEmployee: fire.setFiringEmployee,
    fireError: fire.fireError,
    setFireError: fire.setFireError,
    fireBrainTotal: fire.fireBrainTotal,
    fireBrainLoading: fire.fireBrainLoading,
    fireHandoff: fire.fireHandoff,
    setFireHandoff: fire.setFireHandoff,
    digestEnabled: communication.digestEnabled,
    setDigestEnabled: communication.setDigestEnabled,
    digestTime: communication.digestTime,
    setDigestTime: communication.setDigestTime,
    digestSaving: communication.digestSaving,
    setDigestSaving: communication.setDigestSaving,
    digestDropdownOpen: communication.digestDropdownOpen,
    setDigestDropdownOpen: communication.setDigestDropdownOpen,
    digestDropdownPos: communication.digestDropdownPos,
    preferredChannel: communication.preferredChannel,
    setPreferredChannel: communication.setPreferredChannel,
    channelSaving: communication.channelSaving,
    setChannelSaving: communication.setChannelSaving,
    roleLabelRefs,
    carouselRef,
    agentInfoOpen: communication.agentInfoOpen,
    setAgentInfoOpen: communication.setAgentInfoOpen,
    campaignPanelOpen: communication.campaignPanelOpen,
    setCampaignPanelOpen: communication.setCampaignPanelOpen,
    modelDropdownRef: communication.modelDropdownRef,
    modelDropdownBtnRef: communication.modelDropdownBtnRef,
    modelDropdownPos: communication.modelDropdownPos,
    digestDropdownBtnRef: communication.digestDropdownBtnRef,
    selected: roster.selected,
    selectedAgentKey: roster.selectedAgentKey,
    selectedModelId: roster.selectedModelId,
    hireFilterParam,
    hireFilterRef,
    nonGeneralCampaigns: campaigns.nonGeneralCampaigns,
    generalCampaignId: campaigns.generalCampaignId,
    loadAgents: roster.loadAgents,
    loadChannels: communication.loadChannels,
    syncTeamQuery: roster.syncTeamQuery,
    refreshCampaigns: campaigns.refreshCampaigns,
    userPublicSlug: communication.userPublicSlug,
    setUserPublicSlug: communication.setUserPublicSlug,
  }
}
