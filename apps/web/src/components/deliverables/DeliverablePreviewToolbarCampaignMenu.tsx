'use client'

import type { Dispatch, RefObject, SetStateAction } from 'react'
import { createPortal } from 'react-dom'
import { Check, FolderKanban, Loader2 } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import type {
  CampaignPickerOption,
  CampaignToCampaignAction,
} from '@/components/deliverables/use-deliverable-campaign-menu'

export function DeliverablePreviewToolbarCampaignMenu({
  addToCampaignEligible,
  campaignButtonRef,
  campaignDropdownOpen,
  handleCampaignDropdownToggle,
  campaignsLoading,
  movingToCampaign,
  campaignOptions,
  campaignDropdownPos,
  isMobileToolbar,
  campaignAction,
  setCampaignAction,
  handleSelectCampaign,
}: {
  addToCampaignEligible: boolean
  campaignButtonRef: RefObject<HTMLButtonElement | null>
  campaignDropdownOpen: boolean
  handleCampaignDropdownToggle: () => void
  campaignsLoading: boolean
  movingToCampaign: boolean
  campaignOptions: CampaignPickerOption[]
  campaignDropdownPos: { top: number; left: number; right: number }
  isMobileToolbar: boolean
  campaignAction: CampaignToCampaignAction
  setCampaignAction: Dispatch<SetStateAction<CampaignToCampaignAction>>
  handleSelectCampaign: (campaignId: string) => void
}) {
  if (!addToCampaignEligible) return null

  return (
    <div className="relative">
      <Tooltip
        label={campaignsLoading && campaignDropdownOpen ? 'Loading campaigns...' : 'Add to campaign'}
        side="top"
      >
        <button
          ref={campaignButtonRef}
          type="button"
          onClick={handleCampaignDropdownToggle}
          disabled={movingToCampaign}
          className="btn-icon-bare"
        >
          {campaignsLoading && campaignDropdownOpen ? (
            <Loader2 className="icon-sm animate-spin" />
          ) : (
            <FolderKanban className="icon-sm" />
          )}
        </button>
      </Tooltip>
      {campaignDropdownOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="dropdown-menu-solid dropdown-list-scroll p-spacing-2 z-dropdown fixed w-64"
            style={
              isMobileToolbar
                ? { top: campaignDropdownPos.top, right: campaignDropdownPos.right }
                : { top: campaignDropdownPos.top, left: campaignDropdownPos.left }
            }
            data-dropdown="campaign-move"
          >
            <div className="border-border mb-spacing-2 gap-spacing-1 pb-spacing-2 flex border-b">
              {(['move', 'copy'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  disabled={movingToCampaign}
                  onClick={() => setCampaignAction(mode)}
                  className={`body-4 rounded-spacing-1 px-spacing-2 py-spacing-1.5 flex-1 font-medium transition-colors ${
                    campaignAction === mode
                      ? 'bg-primary/15 text-foreground'
                      : 'text-muted-foreground hover:bg-hover-subtle hover:text-foreground'
                  } disabled:opacity-50`}
                >
                  {mode === 'move' ? 'Move to' : 'Copy to'}
                </button>
              ))}
            </div>
            {campaignsLoading ? (
              <div className="py-spacing-3 flex items-center justify-center">
                <Loader2 className="icon-sm text-muted-foreground animate-spin" />
              </div>
            ) : campaignOptions.length === 0 ? (
              <div className="body-3 text-muted-foreground px-spacing-2 py-spacing-2">
                No campaigns available
              </div>
            ) : (
              <div className="space-y-spacing-0">
                {campaignOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={movingToCampaign || opt.isCurrent}
                    onClick={() => void handleSelectCampaign(opt.id)}
                    className="gap-spacing-2 px-spacing-2 py-spacing-2 rounded-spacing-1 body-3 hover:bg-hover-subtle text-muted-foreground hover:text-foreground flex w-full items-center text-left disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <FolderKanban className="icon-sm shrink-0 opacity-60" />
                    <span className="min-w-0 flex-1 truncate font-medium">{opt.label}</span>
                    {opt.isCurrent ? (
                      <Check className="text-primary icon-sm shrink-0" aria-hidden />
                    ) : null}
                  </button>
                ))}
              </div>
            )}
          </div>,
          document.body,
        )}
    </div>
  )
}
