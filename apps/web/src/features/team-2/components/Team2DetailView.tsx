'use client'

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { useGlobalChatStore } from '@/components/global-chat/store/use-global-chat-store'
import { useShellStore } from '@/components/shell/use-shell-store'
import type { AgentInfoPanelTab, MissionAgent } from '@/lib/agents'
import { cn } from '@/lib/utils/cn'
import { Team2AgentInfoCollapsedRail } from './Team2AgentInfoCollapsedRail'

const COLLAPSED_INFO_PANEL_WIDTH_PX = 56
const EXPANDED_INFO_PANEL_WIDTH_PX = 380
const INFO_PANEL_WIDTH_TRANSITION_MS = 250

interface Team2DetailViewProps {
  agent: MissionAgent
  children: ReactNode
  infoPanelTab: AgentInfoPanelTab
  showAccessTab: boolean
  onInfoPanelTabChange: (tab: AgentInfoPanelTab) => void
  infoPanel: (onRequestCollapse: () => void) => React.ReactNode
}

export function Team2DetailView({
  agent,
  children,
  infoPanelTab,
  showAccessTab,
  onInfoPanelTabChange,
  infoPanel,
}: Team2DetailViewProps) {
  const [infoPanelCollapsed, setInfoPanelCollapsed] = useState(false)
  const chatDrawerOpen = useShellStore((state) => state.chatDrawer.open)
  const openChatDrawer = useShellStore((state) => state.openChatDrawer)
  const setChatHistoryCollapsed = useShellStore((state) => state.setChatHistoryCollapsed)
  const requestAgentSwitch = useGlobalChatStore((state) => state.requestAgentSwitch)
  const setWorkContext = useGlobalChatStore((state) => state.setWorkContext)

  useEffect(() => {
    setInfoPanelCollapsed(false)
  }, [agent.agent_key])

  useEffect(() => {
    setWorkContext({ surface: 'team' })
    requestAgentSwitch(agent.agent_key)
    setChatHistoryCollapsed(false)
    openChatDrawer(null)
  }, [agent.agent_key, openChatDrawer, requestAgentSwitch, setChatHistoryCollapsed, setWorkContext])

  const infoPanelWidthStyle: CSSProperties = {
    width: infoPanelCollapsed
      ? `${COLLAPSED_INFO_PANEL_WIDTH_PX}px`
      : `${EXPANDED_INFO_PANEL_WIDTH_PX}px`,
    transition: `width ${INFO_PANEL_WIDTH_TRANSITION_MS}ms ease-out`,
  }

  return (
    <div className="gap-spacing-3 px-spacing-3 pb-spacing-3 pt-spacing-3 flex h-full min-h-0 flex-1 flex-row overflow-hidden">
      <div
        className={cn(
          'h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden',
          chatDrawerOpen ? 'hidden' : 'flex',
        )}
      >
        {children}
      </div>
      <div
        data-team-agent-info-sidebar
        className={cn(
          'md:pb-spacing-3 relative hidden min-h-0 min-w-0 overflow-hidden will-change-[width] md:flex md:flex-col',
          chatDrawerOpen ? 'w-full flex-1' : 'shrink-0',
        )}
        style={chatDrawerOpen ? undefined : infoPanelWidthStyle}
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
                showWorkTab
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
