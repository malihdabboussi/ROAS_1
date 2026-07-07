import { useEffect, useRef, type Dispatch, type SetStateAction } from 'react'
import { ArrowLeft, Check, ChevronDown, Settings } from 'lucide-react'
import { CampaignPreviewPanel } from '@/components/chat/CampaignPreviewPanelAdapter'
import { LucideIcon } from '@/components/ui/IconPicker'
import type { MobileCampaignSwitcherOption } from './agent-chat-panel.logic'

interface MobilePreviewInfo {
  name: string
  hasSettings: boolean
}

interface AgentChatMobileCampaignPanelProps {
  activeCampaignId: string
  activeCampaignName: string | null
  mobileCampaignSubScreen: 'campaign' | 'preview'
  mobileCampaignSettingsOpen: boolean
  mobilePreviewInfo: MobilePreviewInfo
  mobileCampaignPickerOpen: boolean
  mobileCampaignSwitcherOptions: MobileCampaignSwitcherOption[]
  onMobileCampaignPickerOpenChange: Dispatch<SetStateAction<boolean>>
  onCampaignPanelOpenChange: (open: boolean) => void
  onMobileCampaignSubScreenChange: (screen: 'campaign' | 'preview') => void
  onMobilePreviewInfoChange: (info: MobilePreviewInfo) => void
  onSelectCampaignFromMobilePicker: (campaignId: string) => void
  onMobileSettingsOverlayChange: (open: boolean) => void
}

export function AgentChatMobileCampaignPanel({
  activeCampaignId,
  activeCampaignName,
  mobileCampaignSubScreen,
  mobileCampaignSettingsOpen,
  mobilePreviewInfo,
  mobileCampaignPickerOpen,
  mobileCampaignSwitcherOptions,
  onMobileCampaignPickerOpenChange,
  onCampaignPanelOpenChange,
  onMobileCampaignSubScreenChange,
  onMobilePreviewInfoChange,
  onSelectCampaignFromMobilePicker,
  onMobileSettingsOverlayChange,
}: AgentChatMobileCampaignPanelProps) {
  const mobileCampaignPickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!mobileCampaignPickerOpen) return
    const handler = (e: MouseEvent) => {
      if (!mobileCampaignPickerRef.current?.contains(e.target as Node)) {
        onMobileCampaignPickerOpenChange(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [mobileCampaignPickerOpen, onMobileCampaignPickerOpenChange])

  const handlePreviewBack = () => {
    if (mobileCampaignSettingsOpen) {
      window.dispatchEvent(new Event('mobile-artifact-back'))
      onMobileCampaignSubScreenChange('campaign')
      return
    }
    if (mobilePreviewInfo.name === 'Settings') {
      onMobilePreviewInfoChange({
        name: activeCampaignName ?? 'Campaign',
        hasSettings: true,
      })
      window.dispatchEvent(new Event('mobile-artifact-back'))
      return
    }
    onMobileCampaignSubScreenChange('campaign')
    window.dispatchEvent(new Event('mobile-artifact-back'))
  }

  return (
    <div className="absolute inset-0 z-40 flex min-h-0 flex-col bg-[var(--color-background)]">
      {mobileCampaignSubScreen === 'preview' ? (
        <div className="flex shrink-0 items-center gap-3 px-3 pb-1 pt-3">
          <button
            type="button"
            onClick={handlePreviewBack}
            className="chip-glass-neutral h-spacing-8 w-spacing-8 flex items-center justify-center rounded-lg"
            aria-label="Back to campaign"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="body-2 min-w-0 flex-1 truncate text-center font-medium text-[var(--color-foreground)]">
            {mobilePreviewInfo.name}
          </span>
          {mobilePreviewInfo.hasSettings ? (
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event('mobile-artifact-settings'))}
              className="chip-glass-neutral h-spacing-8 w-spacing-8 flex items-center justify-center rounded-lg"
              aria-label="Settings"
            >
              <Settings className="h-4 w-4" />
            </button>
          ) : (
            <div className="w-spacing-8" />
          )}
        </div>
      ) : (
        <div className="flex shrink-0 items-center gap-3 px-3 pb-1 pt-3">
          <button
            type="button"
            onClick={() => onCampaignPanelOpenChange(false)}
            className="chip-glass-neutral h-spacing-8 w-spacing-8 flex items-center justify-center rounded-lg"
            aria-label="Back to chat"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div ref={mobileCampaignPickerRef} className="relative min-w-0 flex-1">
            <button
              type="button"
              onClick={() => onMobileCampaignPickerOpenChange((open) => !open)}
              className="gap-spacing-1 body-2 hover:bg-hover-subtle rounded-spacing-2 flex w-full min-w-0 items-center justify-center truncate px-2 py-1 text-center font-medium text-[var(--color-foreground)]"
              aria-label="Switch campaign"
              aria-haspopup="listbox"
              aria-expanded={mobileCampaignPickerOpen}
            >
              <span className="min-w-0 truncate">{activeCampaignName ?? 'Campaign'}</span>
              <ChevronDown
                className={`icon-xs shrink-0 opacity-70 transition-transform ${
                  mobileCampaignPickerOpen ? 'rotate-180' : ''
                }`}
              />
            </button>
            {mobileCampaignPickerOpen ? (
              <div
                className="surface-card border-border rounded-spacing-2 z-dropdown absolute left-1/2 top-full mt-1 w-60 -translate-x-1/2 overflow-hidden border shadow-lg"
                role="listbox"
              >
                <div className="p-spacing-1 max-h-72 overflow-y-auto">
                  {mobileCampaignSwitcherOptions.map((option) => {
                    const isSelected = option.id === activeCampaignId
                    return (
                      <button
                        key={option.id}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => onSelectCampaignFromMobilePicker(option.id)}
                        className={`gap-spacing-2 px-spacing-2 py-spacing-1 rounded-spacing-1 body-3 hover:bg-hover-subtle flex w-full items-center text-left ${
                          isSelected
                            ? 'text-foreground'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <LucideIcon
                          name={option.icon ?? 'folder-kanban'}
                          className="icon-sm shrink-0"
                        />
                        <span className="flex-1 truncate">{option.name}</span>
                        {isSelected ? <Check className="icon-xs shrink-0" /> : null}
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => {
              onMobilePreviewInfoChange({ name: 'Settings', hasSettings: false })
              onMobileCampaignSubScreenChange('preview')
              window.dispatchEvent(new CustomEvent('mobile-open-settings'))
            }}
            className="chip-glass-neutral h-spacing-8 w-spacing-8 flex items-center justify-center rounded-lg"
            aria-label="Campaign settings"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      )}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <CampaignPreviewPanel
          mobilePreviewMode={mobileCampaignSubScreen === 'preview'}
          onMobileSettingsOverlayChange={onMobileSettingsOverlayChange}
        />
      </div>
    </div>
  )
}
