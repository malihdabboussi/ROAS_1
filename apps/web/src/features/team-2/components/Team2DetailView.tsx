'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import type { AgentInfoPanelTab, MissionAgent } from '@/lib/agents'
import { ChatTab } from './tabs/ChatTab'
import { Team2AgentInfoCollapsedRail } from './Team2AgentInfoCollapsedRail'

const COLLAPSED_INFO_PANEL_WIDTH_PX = 56
const EXPANDED_INFO_PANEL_WIDTH_PX = 380
const INFO_PANEL_WIDTH_TRANSITION_MS = 250

interface Team2DetailViewProps {
  agent: MissionAgent
  infoPanelTab: AgentInfoPanelTab
  showAccessTab: boolean
  onInfoPanelTabChange: (tab: AgentInfoPanelTab) => void
  infoPanel: (onRequestCollapse: () => void) => React.ReactNode
}

export function Team2DetailView({
  agent,
  infoPanelTab,
  showAccessTab,
  onInfoPanelTabChange,
  infoPanel,
}: Team2DetailViewProps) {
  const [infoPanelCollapsed, setInfoPanelCollapsed] = useState(false)

  useEffect(() => {
    setInfoPanelCollapsed(false)
  }, [agent.agent_key])

  const infoPanelWidthStyle: CSSProperties = {
    width: infoPanelCollapsed
      ? `${COLLAPSED_INFO_PANEL_WIDTH_PX}px`
      : `${EXPANDED_INFO_PANEL_WIDTH_PX}px`,
    transition: `width ${INFO_PANEL_WIDTH_TRANSITION_MS}ms ease-out`,
  }

  return (
    <div className="gap-spacing-3 px-spacing-3 pb-spacing-3 pt-spacing-3 flex h-full min-h-0 flex-1 flex-row overflow-hidden">
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden">
          <ChatTab agent={agent} />
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
