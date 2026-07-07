'use client'

import { RxDoubleArrowLeft } from 'react-icons/rx'
import { Tooltip } from '@/components/ui/tooltip'
import {
  AGENT_INFO_PANEL_TAB_META,
  AgentInfoPanelTabIcon,
  getAgentInfoPanelTabsForDisplay,
  type AgentInfoPanelTab,
  type MissionAgent,
} from '@/lib/agents'
import { cn } from '@/lib/utils/cn'

const RAIL_ICON_BUTTON_CLASS =
  'text-muted-foreground hover:text-foreground hover:bg-hover-subtle flex h-spacing-8 w-spacing-8 shrink-0 items-center justify-center rounded-spacing-2 transition-colors'

const RAIL_TOOLTIP_TRIGGER_CLASS = 'inline-flex shrink-0 items-center justify-center'

export interface Team2AgentInfoCollapsedRailProps {
  agent: MissionAgent
  activeTab: AgentInfoPanelTab
  showAccessTab: boolean
  onExpand: () => void
  onSelectTab: (tab: AgentInfoPanelTab) => void
}

/** Collapsed agent info rail — expand control opens from the right (mirror of conversations rail on the left). */
export function Team2AgentInfoCollapsedRail({
  agent,
  activeTab,
  showAccessTab,
  onExpand,
  onSelectTab,
}: Team2AgentInfoCollapsedRailProps) {
  const tabs = getAgentInfoPanelTabsForDisplay(showAccessTab)

  const handleSelectTab = (tab: AgentInfoPanelTab) => {
    onSelectTab(tab)
    onExpand()
  }

  return (
    <div className="gap-spacing-2 p-spacing-2 flex h-full min-h-0 w-full shrink-0 flex-col items-center overflow-hidden">
      <Tooltip label="Expand agent info" side="left" triggerClassName={RAIL_TOOLTIP_TRIGGER_CLASS}>
        <button
          type="button"
          onClick={onExpand}
          className={RAIL_ICON_BUTTON_CLASS}
          aria-label="Expand agent info"
        >
          <RxDoubleArrowLeft className="icon-sm" aria-hidden />
        </button>
      </Tooltip>

      <div className="surface-bg h-spacing-8 w-spacing-8 shrink-0 overflow-hidden rounded-xl border border-border">
        {agent.image_url ? (
          <img src={agent.image_url} alt="" className="h-full w-full object-cover object-top" />
        ) : (
          <div className="bg-muted text-muted-foreground flex h-full w-full items-center justify-center">
            <span className="body-4 font-semibold uppercase">{agent.name.slice(0, 1)}</span>
          </div>
        )}
      </div>

      <div className="mt-spacing-3 gap-spacing-2 flex shrink-0 flex-col items-center">
        {tabs.map((tab) => {
          const meta = AGENT_INFO_PANEL_TAB_META[tab]
          const selected = activeTab === tab
          return (
            <Tooltip
              key={tab}
              label={meta.label}
              side="left"
              triggerClassName={RAIL_TOOLTIP_TRIGGER_CLASS}
            >
              <button
                type="button"
                onClick={() => handleSelectTab(tab)}
                className={cn(
                  RAIL_ICON_BUTTON_CLASS,
                  selected && 'text-foreground bg-hover-subtle',
                )}
                aria-label={meta.label}
                aria-current={selected ? 'true' : undefined}
              >
                <AgentInfoPanelTabIcon tab={tab} size="rail" />
              </button>
            </Tooltip>
          )
        })}
      </div>

      <div className="px-spacing-1 pb-spacing-1 pt-spacing-2 mt-auto flex w-full shrink-0 items-center justify-center">
        <span
          className="typo-section-label text-muted-foreground"
          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
        >
          {agent.name}
        </span>
      </div>
    </div>
  )
}
