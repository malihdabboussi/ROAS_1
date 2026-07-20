'use client'

import type { LucideIcon } from 'lucide-react'
import { BriefcaseBusiness, CircleUser, Radio, Shield, Wrench } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { AgentInfoPanelTab } from './agent-info-panel-tabs'

/** Skills / Comms / Access match `AgentActionsMenu`; Info uses profile icon (not Settings2 — integrations). */
export const AGENT_INFO_PANEL_TAB_META: Record<
  AgentInfoPanelTab,
  { label: string; menuLabel: string; Icon: LucideIcon }
> = {
  info: { label: 'Info', menuLabel: 'Edit', Icon: CircleUser },
  work: { label: 'Work', menuLabel: 'Work', Icon: BriefcaseBusiness },
  skills: { label: 'Skills', menuLabel: 'Skills', Icon: Wrench },
  communication: { label: 'Comms', menuLabel: 'Comms', Icon: Radio },
  access: { label: 'Access', menuLabel: 'Access', Icon: Shield },
}

export const AGENT_INFO_PANEL_TAB_ICON_CLASS = 'icon-xs shrink-0'

export const AGENT_INFO_PANEL_TAB_ICON_RAIL_CLASS = 'icon-sm shrink-0'

export function getAgentInfoPanelTabsForDisplay(
  showAccess: boolean,
  showWork = false,
): AgentInfoPanelTab[] {
  const tabs: AgentInfoPanelTab[] = ['info', 'skills', 'communication']
  if (showWork) tabs.splice(1, 0, 'work')
  if (showAccess) tabs.push('access')
  return tabs
}

export function AgentInfoPanelTabIcon({
  tab,
  className,
  size = 'tab',
}: {
  tab: AgentInfoPanelTab
  className?: string
  /** `tab` = small icons in expanded tabs; `rail` = normal icons in collapsed rail */
  size?: 'tab' | 'rail'
}) {
  const Icon = AGENT_INFO_PANEL_TAB_META[tab].Icon
  const base =
    size === 'rail' ? AGENT_INFO_PANEL_TAB_ICON_RAIL_CLASS : AGENT_INFO_PANEL_TAB_ICON_CLASS
  return <Icon className={cn(base, className)} aria-hidden />
}
