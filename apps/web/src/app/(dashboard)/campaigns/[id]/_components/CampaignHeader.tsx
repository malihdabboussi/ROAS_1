'use client'

import { AlertTriangle, Check, Loader2 } from 'lucide-react'
import { IconPicker, type IconColorId } from '@/components/ui/IconPicker'
import { HierarchyViewBar } from '@/components/work-views'
import type { Campaign } from '@/features/studio/types'
import type { CampaignSaveStatus } from '../_hooks/use-campaign-autosave'
import type { ToggleableCampaignTabId } from '../_lib/campaign-nav-tabs'
import type { CampaignContext, CampaignResources } from '../_lib/types'
import { CampaignTabSettingsMenu } from './CampaignTabSettingsMenu'

interface CampaignHeaderProps {
  campaign: Campaign
  campaignIcon: string
  campaignIconColor?: string
  /** Visible campaign tabs (excluding Settings), in order, plus Settings last — parent builds this. */
  navTabs: { value: string; label: string; icon: string }[]
  activeTab: string
  onTabChange: (value: string) => void
  editingName: boolean
  nameValue: string
  saveStatus: CampaignSaveStatus
  context: CampaignContext
  resources: CampaignResources
  setNameValue: (value: string) => void
  setEditingName: (value: boolean) => void
  onNameSave: () => Promise<void>
  onIconChange: (icon: string) => Promise<void>
  onIconColorChange?: (colorId: IconColorId) => Promise<void>
  onRetrySave: (context: CampaignContext, resources: CampaignResources) => Promise<void>
  visibleTabIds: ToggleableCampaignTabId[]
  onVisibleTabIdsChange: (ids: ToggleableCampaignTabId[]) => void
  fixedTabs?: boolean
}

export function CampaignHeader({
  campaign,
  campaignIcon,
  campaignIconColor,
  navTabs,
  activeTab,
  onTabChange,
  editingName,
  nameValue,
  saveStatus,
  context,
  resources,
  setNameValue,
  setEditingName,
  onNameSave,
  onIconChange,
  onIconColorChange,
  onRetrySave,
  visibleTabIds,
  onVisibleTabIdsChange,
  fixedTabs = false,
}: CampaignHeaderProps) {
  return (
    <div className="flex flex-col">
      <div className="gap-spacing-4 px-spacing-4 pb-spacing-3 flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <IconPicker
            value={campaignIcon}
            color={campaignIconColor}
            onChange={(icon) => void onIconChange(icon)}
            onColorChange={
              onIconColorChange ? (colorId) => void onIconColorChange(colorId) : undefined
            }
            size="md"
          />
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {editingName ? (
              <input
                value={nameValue}
                onChange={(event) => setNameValue(event.target.value)}
                onBlur={() => void onNameSave()}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void onNameSave()
                  if (event.key === 'Escape') {
                    setNameValue(campaign.name)
                    setEditingName(false)
                  }
                }}
                className="input-glass py-spacing-1 text-foreground text-lg font-bold"
                autoFocus
              />
            ) : (
              <h1
                className="text-foreground hover:text-primary cursor-pointer truncate text-lg font-bold"
                onClick={() => {
                  setNameValue(campaign.name)
                  setEditingName(true)
                }}
              >
                {campaign.name}
              </h1>
            )}

            <div className="flex items-center gap-2">
              {saveStatus === 'saving' && (
                <span className="body-4 text-muted-foreground flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...
                </span>
              )}
              {saveStatus === 'saved' && (
                <span className="body-4 flex items-center gap-1.5 text-emerald-400">
                  <Check className="h-3.5 w-3.5" /> Saved
                </span>
              )}
              {saveStatus === 'failed' && (
                <button
                  onClick={() => void onRetrySave(context, resources)}
                  className="body-4 flex items-center gap-1.5 rounded-md bg-red-500/10 px-2 py-1 text-red-400 transition-colors hover:bg-red-500/20"
                >
                  <AlertTriangle className="h-3.5 w-3.5" /> Save failed — Retry
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      <HierarchyViewBar
        tabs={navTabs.map((tab) => ({ id: tab.value, label: tab.label, icon: tab.icon }))}
        activeViewId={activeTab}
        onSelectView={onTabChange}
        rightSlot={
          fixedTabs ? null : (
            <CampaignTabSettingsMenu
              visibleTabIds={visibleTabIds}
              onVisibleTabIdsChange={onVisibleTabIdsChange}
            />
          )
        }
      />
    </div>
  )
}
