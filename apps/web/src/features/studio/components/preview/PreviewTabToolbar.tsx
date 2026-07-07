'use client'

import {
  Box,
  CalendarClock,
  Folder,
  LayoutDashboard,
  PanelRightClose,
  Settings,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { TabType } from '../../types/studio.types'

interface PreviewTabToolbarProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
  isCampaignMode: boolean
  hasSocialContent: boolean
  onMinimize: () => void
  /** No longer used for alignment (mobile always centered via CSS); kept for future per-context tweaks. */
  mobilePreviewMode?: boolean
}

interface TabDef {
  id: TabType
  label: string
  icon: LucideIcon
  campaignOnly?: boolean
  /** Omit from mobile tab row; show from md breakpoint up (Settings duplicates header on mobile). */
  desktopOnly?: boolean
}

const tabs: TabDef[] = [
  { id: 'artifacts', label: 'Artifacts', campaignOnly: true, icon: Box },
  // { id: 'workflow', label: 'Workflow', campaignOnly: true, icon: GitBranch },
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'leads', label: 'Leads', campaignOnly: true, icon: Users },
  { id: 'media', label: 'Media', campaignOnly: true, icon: Folder },
  { id: 'schedule', label: 'Schedule', campaignOnly: true, icon: CalendarClock },
  { id: 'settings', label: 'Settings', campaignOnly: true, icon: Settings, desktopOnly: true },
]

export function PreviewTabToolbar({
  activeTab,
  onTabChange,
  isCampaignMode,
  hasSocialContent,
  onMinimize,
  mobilePreviewMode: _mobilePreviewMode = false,
}: PreviewTabToolbarProps) {
  const visibleTabs = tabs.filter((tab) => {
    if (tab.campaignOnly && !isCampaignMode) return false
    if (tab.id === 'schedule' && !hasSocialContent) return false
    return true
  })

  return (
    <div className="gap-spacing-1 flex shrink-0 items-center bg-[var(--color-background)] py-1">
      <div
        className="gap-spacing-1 flex min-w-0 flex-1 items-center overflow-x-auto py-0.5 max-md:justify-center md:justify-start"
        style={{ scrollbarWidth: 'none' }}
      >
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`gap-spacing-2 h-spacing-8 rounded-spacing-3 shrink-0 items-center transition-all duration-[600ms] ease-in-out ${
              activeTab === tab.id
                ? 'chip-glass-blue px-spacing-3'
                : 'chip-glass-neutral px-spacing-2'
            } ${tab.desktopOnly ? 'hidden md:flex' : 'flex'}`}
            onClick={() => onTabChange(tab.id)}
          >
            <tab.icon className="h-4 w-4" />
            {activeTab === tab.id && (
              <span className="body-2 whitespace-nowrap font-semibold">{tab.label}</span>
            )}
          </button>
        ))}
      </div>

      <div className="gap-spacing-2 hidden shrink-0 items-center md:flex">
        <button
          type="button"
          data-tooltip="Minimize"
          data-side="left"
          className="tooltip p-spacing-2 rounded-spacing-2 chip-glass-neutral hover:chip-glass-blue transition-all"
          onClick={onMinimize}
        >
          <PanelRightClose className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
