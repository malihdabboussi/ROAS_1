'use client'

import type { ComponentProps } from 'react'
import { TeamModals } from '@/components/agents/TeamModals'
import type { MissionAgent } from '@/lib/agents'
import type {
  Team2ManageData,
  Team2ManageDerived,
  Team2ManageHandlers,
} from './team2-manage-content.types'

interface Team2ContainerModalsProps {
  data: Team2ManageData
  derived: Team2ManageDerived
  handlers: Team2ManageHandlers
  selectedFromUrl: MissionAgent | null
}

export function Team2ContainerModals({
  data,
  derived,
  handlers,
  selectedFromUrl,
}: Team2ContainerModalsProps) {
  return (
    <TeamModals
      {...({
        agents: data.agents,
        selected: selectedFromUrl ?? data.selected,
        generalCampaignId: data.generalCampaignId,
        hireFilterParam: data.hireFilterParam,
        hireFilterRef: data.hireFilterRef,
        showReadyEmployees: data.showReadyEmployees,
        setShowReadyEmployees: data.setShowReadyEmployees,
        showTelegramSetup: data.showTelegramSetup,
        setShowTelegramSetup: data.setShowTelegramSetup,
        showSlackSetup: data.showSlackSetup,
        setShowSlackSetup: data.setShowSlackSetup,
        showUpgradeModal: data.showUpgradeModal,
        setShowUpgradeModal: data.setShowUpgradeModal,
        showFireConfirm: data.showFireConfirm,
        setShowFireConfirm: data.setShowFireConfirm,
        isSelectedRemovable: derived.isSelectedRemovable,
        isSelectedManager: derived.isSelectedManager,
        checkoutLoading: data.checkoutLoading,
        brainError: data.brainError,
        firingEmployee: data.firingEmployee,
        fireError: data.fireError,
        fireBrainTotal: data.fireBrainTotal,
        fireBrainLoading: data.fireBrainLoading,
        fireHandoff: data.fireHandoff,
        setFireHandoff: data.setFireHandoff,
        nonGeneralCampaigns: data.nonGeneralCampaigns,
        handleAddBrain: handlers.handleAddBrain,
        handleFireEmployee: handlers.handleFireEmployee,
        loadAgents: data.loadAgents,
        loadChannels: data.loadChannels,
        setFireError: data.setFireError,
      } as ComponentProps<typeof TeamModals>)}
    />
  )
}
