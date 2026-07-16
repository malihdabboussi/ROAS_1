'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import type { AgentInfoPanelTab, MissionAgent } from '@/lib/agents'
import type { Campaign } from '@/lib/campaigns'
import type { Mission } from '@/lib/missions'
import { cn } from '@/lib/utils/cn'
import { AgentWorkTab } from './tabs/AgentWorkTab'
import { ChatTab } from './tabs/ChatTab'
import { Team2AgentInfoCollapsedRail } from './Team2AgentInfoCollapsedRail'

const COLLAPSED_INFO_PANEL_WIDTH_PX = 56
const EXPANDED_INFO_PANEL_WIDTH_PX = 380
const INFO_PANEL_WIDTH_TRANSITION_MS = 250

type DeskTab = 'work' | 'chat'

interface Team2DetailViewProps {
  agent: MissionAgent
  infoPanelTab: AgentInfoPanelTab
  showAccessTab: boolean
  onInfoPanelTabChange: (tab: AgentInfoPanelTab) => void
  infoPanel: (onRequestCollapse: () => void) => React.ReactNode
  assignedCampaigns?: Campaign[]
  nonGeneralCampaigns?: Campaign[]
  generalCampaignId?: string
  missions?: Mission[]
  onAssignWork?: () => void
  initialDeskTab?: DeskTab
}

export function Team2DetailView({
  agent,
  infoPanelTab,
  showAccessTab,
  onInfoPanelTabChange,
  infoPanel,
  assignedCampaigns = [],
  nonGeneralCampaigns = [],
  generalCampaignId,
  missions = [],
  onAssignWork,
  initialDeskTab,
}: Team2DetailViewProps) {
  const [infoPanelCollapsed, setInfoPanelCollapsed] = useState(false)
  const [deskTab, setDeskTab] = useState<DeskTab>(initialDeskTab ?? 'work')

  useEffect(() => {
    setInfoPanelCollapsed(false)
    setDeskTab(initialDeskTab ?? 'work')
  }, [agent.agent_key, initialDeskTab])

  const infoPanelWidthStyle: CSSProperties = {
    width: infoPanelCollapsed
      ? `${COLLAPSED_INFO_PANEL_WIDTH_PX}px`
      : `${EXPANDED_INFO_PANEL_WIDTH_PX}px`,
    transition: `width ${INFO_PANEL_WIDTH_TRANSITION_MS}ms ease-out`,
  }

  return (
    <div className="gap-spacing-3 px-spacing-3 pb-spacing-3 pt-spacing-3 flex h-full min-h-0 flex-1 flex-row overflow-hidden">
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="gap-spacing-1 p-spacing-1 mb-spacing-2 flex shrink-0">
          {(
            [
              { id: 'work', label: 'Work' },
              { id: 'chat', label: 'Chat' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setDeskTab(tab.id)}
              className={cn(
                'body-3 rounded-spacing-2 px-spacing-3 py-spacing-2 transition-colors',
                deskTab === tab.id
                  ? 'bg-secondary text-foreground font-medium'
                  : 'text-muted-foreground hover:bg-hover-subtle hover:text-foreground',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden">
          {deskTab === 'work' ? (
            <AgentWorkTab
              agent={agent}
              missions={missions}
              onAssignWork={() => onAssignWork?.()}
            />
          ) : (
            <ChatTab
              agent={agent}
              assignedCampaigns={assignedCampaigns}
              nonGeneralCampaigns={nonGeneralCampaigns}
              generalCampaignId={generalCampaignId}
            />
          )}
        </div>
      </div>
      <div
        data-team-agent-info-sidebar
        className="md:pb-spacing-3 relative hidden min-h-0 min-w-0 shrink-0 overflow-hidden will-change-[width] md:flex md:flex-col"
        style={infoPanelWidthStyle}
      >
        <div className="card-glass flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border-0">
          <div className={infoPanelCollapsed ? 'hidden' : 'group relative h-full min-h-0'}>
            <div className="h-full min-h-0">{infoPanel(() => setInfoPanelCollapsed(true))}</div>
          </div>
          {infoPanelCollapsed ? (
            <div className="h-full min-h-0">
              <Team2AgentInfoCollapsedRail
                agent={agent}
                activeTab={infoPanelTab}
                showAccessTab={showAccessTab}
                onExpand={() => setInfoPanelCollapsed(false)}
                onSelectTab={onInfoPanelTabChange}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
