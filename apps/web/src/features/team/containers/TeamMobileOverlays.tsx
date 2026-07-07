'use client'

import { Menu } from 'lucide-react'
import type { MissionAgent } from '@/features/mission-control/types'
import type { Campaign } from '@/features/studio/types'
import { AgentChatPanel } from '../components/AgentChatPanel'
import type { AgentInfoPanelProps } from '../components/chat/AgentInfoPanel'
import { AgentInfoPanel } from '../components/chat/AgentInfoPanel'

type AgentInfoBase = Omit<AgentInfoPanelProps, 'fullScreen' | 'onClose'>

interface TeamMobileOverlaysProps {
  isMobile: boolean
  mobileTeamView: 'card' | 'chat'
  selected: MissionAgent | null
  selectedModelId: string
  selectedSessionId: string | null
  setMobileTeamView: (view: 'card' | 'chat') => void
  handleSessionChange: (nextSessionId: string | null) => void
  statusBadgeText: string | null
  agentInfoOpen: boolean
  onAgentInfoOpenChange: (open: boolean) => void
  campaignPanelOpen: boolean
  onCampaignPanelOpenChange: (open: boolean) => void
  teamAgents: MissionAgent[]
  onNavigateToConversation: (params: {
    conversationId: string
    messageId?: string
    agentKey: string
  }) => void
  agentInfoBaseProps: AgentInfoBase
  nonGeneralCampaigns: Campaign[]
  generalCampaignId?: string
  assignedCampaigns?: Campaign[]
  onAssignAgentToCampaign?: (campaignId: string) => Promise<void>
  allCampaigns: Campaign[]
  onCampaignsRefresh: () => void | Promise<void>
}

export function TeamMobileOverlays({
  isMobile,
  mobileTeamView,
  selected,
  selectedModelId,
  selectedSessionId,
  setMobileTeamView,
  handleSessionChange,
  statusBadgeText,
  agentInfoOpen,
  onAgentInfoOpenChange,
  campaignPanelOpen,
  onCampaignPanelOpenChange,
  teamAgents,
  onNavigateToConversation,
  agentInfoBaseProps,
  nonGeneralCampaigns,
  generalCampaignId,
  assignedCampaigns,
  onAssignAgentToCampaign,
  allCampaigns,
  onCampaignsRefresh,
}: TeamMobileOverlaysProps) {
  return (
    <>
      {isMobile && mobileTeamView === 'card' && (
        <div className="flex shrink-0 items-center gap-3 py-0">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event('toggle-mobile-sidebar'))}
            className="chip-glass-neutral h-spacing-8 w-spacing-8 flex shrink-0 items-center justify-center rounded-lg"
            aria-label="Open menu"
          >
            <Menu className="h-4 w-4" />
          </button>
          <span className="body-2 min-w-0 flex-1 truncate text-center font-medium text-[var(--color-foreground)]">
            Team
          </span>
          {selected ? (
            <button
              type="button"
              onClick={() => {
                handleSessionChange(null)
                setMobileTeamView('chat')
              }}
              className="button-glass-primary body-3 flex h-spacing-8 shrink-0 items-center justify-center rounded-spacing-2 px-spacing-3"
            >
              Chat
            </button>
          ) : (
            <div className="h-spacing-8 w-spacing-8 shrink-0" aria-hidden />
          )}
        </div>
      )}

      {isMobile && mobileTeamView === 'chat' && selected && (
        <div className="absolute inset-0 z-30 flex min-h-0 flex-col bg-[var(--color-background)]">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <AgentChatPanel
              key={selected.agent_key}
              agent={selected}
              modelId={selectedModelId}
              initialSessionId={selectedSessionId}
              onSessionChange={handleSessionChange}
              statusBadgeText={statusBadgeText}
              agentInfoOpen={agentInfoOpen}
              onAgentInfoOpenChange={onAgentInfoOpenChange}
              campaignPanelOpen={campaignPanelOpen}
              onCampaignPanelOpenChange={onCampaignPanelOpenChange}
              onMobileBackToTeam={() => {
                onAgentInfoOpenChange(false)
                onCampaignPanelOpenChange(false)
                setMobileTeamView('card')
              }}
              onMobileGoToTeamRoster={() => {
                handleSessionChange(null)
                onAgentInfoOpenChange(false)
                onCampaignPanelOpenChange(false)
                setMobileTeamView('card')
              }}
              teamAgents={teamAgents}
              onNavigateToConversation={onNavigateToConversation}
              nonGeneralCampaigns={nonGeneralCampaigns}
              generalCampaignId={generalCampaignId}
              assignedCampaigns={assignedCampaigns ?? []}
              onAssignAgentToCampaign={onAssignAgentToCampaign ?? (async () => {})}
              allCampaigns={allCampaigns}
              onCampaignsRefresh={onCampaignsRefresh}
              isMobile={isMobile}
              renderAgentInfoPanel={() => (
                <AgentInfoPanel
                  {...agentInfoBaseProps}
                  selected={selected}
                  fullScreen
                  onClose={() => onAgentInfoOpenChange(false)}
                />
              )}
            />
          </div>
        </div>
      )}
    </>
  )
}
