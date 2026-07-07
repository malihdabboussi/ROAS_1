import type { RefObject } from 'react'
import { Check, Cloud, Flag, FolderOpen, HardDrive, Mic, Paperclip, Plus, Upload } from 'lucide-react'
import { CloudAttachMenuItems } from '@/components/media/CloudAttachMenuItems'
import { LucideIcon } from '@/components/ui/IconPicker'
import { Tooltip } from '@/components/ui/tooltip'
import { MISSION_CAPTURE_TEXT_MAX_CHARS } from '../config/mission-field-limits.config'
import type { MissionPriority } from '../types'
import type { CampaignOption, MissionQuickCaptureDropdown } from './mission-quick-capture-config'
import { PRIORITIES } from './mission-quick-capture-config'

interface MissionQuickCaptureIdleFooterProps {
  isModernComposer: boolean
  iconBtnClass: string
  filesCount: number
  disabled: boolean
  activeDropdown: MissionQuickCaptureDropdown
  setActiveDropdown: (dropdown: MissionQuickCaptureDropdown) => void
  fileInputRef: RefObject<HTMLInputElement | null>
  openDrive: () => void
  openDropbox: () => void
  hideCampaignSelector: boolean
  activeCampaign: CampaignOption | undefined
  campaignError: boolean
  campaigns: CampaignOption[]
  selectedCampaignId: string | null
  onCampaignChange: (campaignId: string | null) => void
  hidePrioritySelector: boolean
  priority: MissionPriority | null
  onPriorityChange: (priority: MissionPriority | null) => void
  hideCharCount: boolean
  inputValue: string
  onStartRecording: () => void
  creditsExhausted: boolean
  onSubmit: () => void
}

export function MissionQuickCaptureIdleFooter({
  isModernComposer,
  iconBtnClass,
  filesCount,
  disabled,
  activeDropdown,
  setActiveDropdown,
  fileInputRef,
  openDrive,
  openDropbox,
  hideCampaignSelector,
  activeCampaign,
  campaignError,
  campaigns,
  selectedCampaignId,
  onCampaignChange,
  hidePrioritySelector,
  priority,
  onPriorityChange,
  hideCharCount,
  inputValue,
  onStartRecording,
  creditsExhausted,
  onSubmit,
}: MissionQuickCaptureIdleFooterProps) {
  const active = priority ? (PRIORITIES.find((p) => p.value === priority) ?? null) : null

  return (
    <div
      className={`flex items-center justify-between ${isModernComposer ? 'py-spacing-2 px-3' : 'px-3 py-2'}`}
    >
      <div className="flex items-center gap-1">
        {isModernComposer ? (
          <div className="relative" data-dropdown>
            <Tooltip label="Add">
              <button
                type="button"
                onClick={() => setActiveDropdown(activeDropdown === 'attach' ? null : 'attach')}
                disabled={disabled}
                className={`${iconBtnClass} ${filesCount > 0 ? 'text-primary' : ''}`}
                aria-label="Add files"
              >
                <Plus className="h-4 w-4" />
              </button>
            </Tooltip>
            {activeDropdown === 'attach' && (
              <div className="mt-spacing-1 absolute left-0 top-full z-50" data-dropdown>
                <div className="dropdown-menu-solid p-spacing-2 min-w-48">
                  <div className="space-y-spacing-1">
                    <CloudAttachMenuItems
                      onLocalUpload={() => fileInputRef.current?.click()}
                      onDrive={openDrive}
                      onDropbox={openDropbox}
                      onSelect={() => setActiveDropdown(null)}
                      localLabel="Upload from local"
                      localIcon={<Upload className="icon-sm" />}
                      driveIcon={<HardDrive className="icon-sm" />}
                      dropboxIcon={<Cloud className="icon-sm" />}
                      itemClassName="body-3 text-foreground hover:bg-hover-subtle px-spacing-3 py-spacing-2 gap-spacing-2 flex w-full items-center text-left transition-colors"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="tooltip relative" data-tooltip="Attach files" data-dropdown>
            <button
              type="button"
              onClick={() => setActiveDropdown(activeDropdown === 'attach' ? null : 'attach')}
              disabled={disabled}
              className={`button-glass-neutral flex h-8 w-8 items-center justify-center rounded-full transition-all disabled:opacity-30 ${filesCount > 0 ? 'text-primary' : ''}`}
            >
              <Paperclip className="h-3.5 w-3.5" />
            </button>
            {activeDropdown === 'attach' && (
              <div className="mt-spacing-1 absolute left-0 top-full z-50" data-dropdown>
                <div className="dropdown-menu-solid p-spacing-2 min-w-48">
                  <div className="space-y-spacing-1">
                    <CloudAttachMenuItems
                      onLocalUpload={() => fileInputRef.current?.click()}
                      onDrive={openDrive}
                      onDropbox={openDropbox}
                      onSelect={() => setActiveDropdown(null)}
                      localLabel="Upload from local"
                      localIcon={<Upload className="icon-sm" />}
                      driveIcon={<HardDrive className="icon-sm" />}
                      dropboxIcon={<Cloud className="icon-sm" />}
                      itemClassName="gap-spacing-2 px-spacing-2 py-spacing-2 rounded-spacing-1 body-3 flex w-full items-center text-left hover:bg-hover-subtle text-muted-foreground hover:text-foreground"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {!hideCampaignSelector ? (
          <div
            className="tooltip relative"
            data-tooltip={activeCampaign?.name || 'Campaign'}
            data-dropdown
          >
            <button
              type="button"
              onClick={() => setActiveDropdown(activeDropdown === 'campaign' ? null : 'campaign')}
              disabled={disabled}
              className={`button-glass-neutral flex h-8 items-center gap-1.5 rounded-full px-2.5 transition-all disabled:opacity-30 ${
                campaignError && !activeCampaign
                  ? 'border-red-500/70 bg-red-500/10 text-red-300'
                  : activeCampaign
                    ? 'text-primary'
                    : ''
              }`}
            >
              {activeCampaign ? (
                <LucideIcon name={activeCampaign.icon ?? 'folder-kanban'} className="h-3.5 w-3.5" />
              ) : (
                <FolderOpen className="h-3.5 w-3.5" />
              )}
              {activeCampaign && (
                <span className="typo-caption max-w-[100px] truncate font-medium">
                  {activeCampaign.name}
                </span>
              )}
            </button>
            {activeDropdown === 'campaign' && (
              <div className="mt-spacing-1 absolute left-0 top-full z-50" data-dropdown>
                <div className="dropdown-menu-solid p-spacing-2 min-w-48">
                  <div className="space-y-spacing-1">
                    <button
                      type="button"
                      onClick={() => {
                        onCampaignChange(null)
                        setActiveDropdown(null)
                      }}
                      className={`gap-spacing-2 px-spacing-2 py-spacing-2 rounded-spacing-1 body-3 flex w-full items-center text-left ${!selectedCampaignId ? 'bg-primary/10 text-muted-foreground' : 'hover:bg-hover-subtle text-muted-foreground hover:text-foreground'}`}
                    >
                      {!selectedCampaignId ? (
                        <Check className="icon-sm text-muted-foreground" />
                      ) : (
                        <div className="icon-sm" />
                      )}
                      <span>No campaign</span>
                    </button>
                    {campaigns.map((c) => {
                      const isSelected = selectedCampaignId === c.id
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            onCampaignChange(c.id)
                            setActiveDropdown(null)
                          }}
                          className={`gap-spacing-2 px-spacing-2 py-spacing-2 rounded-spacing-1 body-3 flex w-full items-center text-left ${isSelected ? 'bg-primary/10 text-muted-foreground' : 'hover:bg-hover-subtle text-muted-foreground hover:text-foreground'}`}
                        >
                          <LucideIcon name={c.icon ?? 'folder-kanban'} className="icon-sm shrink-0" />
                          <span>{c.name}</span>
                          {isSelected && <Check className="icon-sm text-muted-foreground ml-auto" />}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : null}

        {!hidePrioritySelector ? (
          <div
            className="tooltip relative"
            data-tooltip={active ? `${active.label} priority` : 'Set priority'}
            data-dropdown
          >
            <button
              type="button"
              onClick={() => setActiveDropdown(activeDropdown === 'priority' ? null : 'priority')}
              disabled={disabled}
              className="button-glass-neutral flex h-8 w-8 items-center justify-center rounded-full transition-all disabled:opacity-30"
            >
              <Flag className={`h-3.5 w-3.5 ${active ? active.color : 'text-muted-foreground'}`} />
            </button>
            {activeDropdown === 'priority' && (
              <div className="mt-spacing-1 absolute left-0 top-full z-50" data-dropdown>
                <div className="dropdown-menu-solid p-spacing-2 min-w-40">
                  <div className="space-y-spacing-1">
                    <button
                      type="button"
                      onClick={() => {
                        onPriorityChange(null)
                        setActiveDropdown(null)
                      }}
                      className={`gap-spacing-2 px-spacing-2 py-spacing-2 rounded-spacing-1 body-3 text-muted-foreground flex w-full items-center text-left ${!priority ? 'bg-primary/10' : 'hover:bg-hover-subtle hover:text-foreground'}`}
                    >
                      <Flag className="icon-sm" />
                      <span>No priority</span>
                      {!priority && <Check className="icon-sm ml-auto" />}
                    </button>
                    {PRIORITIES.map((p) => {
                      const isSelected = priority === p.value
                      return (
                        <button
                          key={p.value}
                          type="button"
                          onClick={() => {
                            onPriorityChange(p.value)
                            setActiveDropdown(null)
                          }}
                          className={`gap-spacing-2 px-spacing-2 py-spacing-2 rounded-spacing-1 body-3 flex w-full items-center text-left ${isSelected ? 'bg-primary/10' : 'hover:bg-hover-subtle hover:text-foreground'} ${p.color}`}
                        >
                          <Flag className="icon-sm" />
                          <span>{p.label}</span>
                          {isSelected && <Check className="icon-sm ml-auto" />}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>

      <div className={`flex items-center ${isModernComposer ? 'gap-0.5' : 'gap-1'}`}>
        {!hideCharCount ? (
          <span className="body-4 text-muted-foreground tabular-nums">
            {inputValue.length.toLocaleString()}/{MISSION_CAPTURE_TEXT_MAX_CHARS.toLocaleString()}
          </span>
        ) : null}
        {isModernComposer ? (
          <Tooltip label="Voice input">
            <button type="button" onClick={onStartRecording} disabled={disabled} className={iconBtnClass}>
              <Mic className="h-3.5 w-3.5" />
            </button>
          </Tooltip>
        ) : (
          <span className="tooltip" data-tooltip="Voice input">
            <button
              type="button"
              onClick={onStartRecording}
              disabled={disabled}
              className="button-glass-neutral flex h-8 w-8 items-center justify-center rounded-full transition-all disabled:opacity-30"
            >
              <Mic className="h-3.5 w-3.5" />
            </button>
          </span>
        )}
        {isModernComposer ? (
          <Tooltip
            label={
              creditsExhausted
                ? 'Get credits to send missions'
                : !selectedCampaignId
                  ? 'Choose a campaign first'
                  : 'Send mission'
            }
          >
            <button
              type="button"
              onClick={onSubmit}
              disabled={disabled || (!creditsExhausted && !inputValue.trim())}
              className={`flex h-8 items-center justify-center rounded-full transition-colors disabled:opacity-30 ${
                creditsExhausted
                  ? 'button-glass-accent gap-1.5 px-3'
                  : 'bg-secondary text-primary hover:bg-secondary/90 w-8'
              }`}
              aria-label={creditsExhausted ? 'Get credits' : 'Send mission'}
            >
              {creditsExhausted ? (
                <span className="typo-caption font-medium">Get Credits</span>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              )}
            </button>
          </Tooltip>
        ) : (
          <span
            className="tooltip"
            data-tooltip={
              creditsExhausted
                ? 'Get credits to send missions'
                : !selectedCampaignId
                  ? 'Choose a campaign first'
                  : 'Send mission'
            }
          >
            <button
              type="button"
              onClick={onSubmit}
              disabled={disabled || (!creditsExhausted && !inputValue.trim())}
              className={`flex h-8 items-center justify-center rounded-full transition-all disabled:opacity-30 ${creditsExhausted ? 'button-glass-accent gap-1.5 px-3' : 'button-glass-neutral w-8'}`}
              aria-label={creditsExhausted ? 'Get credits' : 'Send mission'}
            >
              {creditsExhausted ? (
                <span className="typo-caption font-medium">Get Credits</span>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              )}
            </button>
          </span>
        )}
      </div>
    </div>
  )
}
