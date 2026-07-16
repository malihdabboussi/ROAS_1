'use client'

import type { Dispatch, RefObject, SetStateAction } from 'react'
import { FileText, MessageSquarePlus, Monitor, X } from 'lucide-react'
import type {
  BrainOption,
  ViewMode,
} from '@/components/deliverables/deliverable-preview-modal.types'
import { DeliverablePreviewToolbarBrainMenu } from '@/components/deliverables/DeliverablePreviewToolbarBrainMenu'
import { DeliverablePreviewToolbarCampaignMenu } from '@/components/deliverables/DeliverablePreviewToolbarCampaignMenu'
import { DeliverablePreviewToolbarFileActions } from '@/components/deliverables/DeliverablePreviewToolbarFileActions'
import type {
  CampaignPickerOption,
  CampaignToCampaignAction,
} from '@/components/deliverables/use-deliverable-campaign-menu'
import { Tooltip } from '@/components/ui/tooltip'
import type { MissionDeliverable } from '@/lib/missions'

export function DeliverablePreviewModalToolbar({
  deliverable,
  onClose,
  isTextType,
  viewMode,
  setViewMode,
  copied,
  effectiveContent,
  brainButtonRef,
  brainDropdownOpen,
  handleBrainDropdownToggle,
  brainsLoading,
  brainDropdownPos,
  isMobileToolbar,
  brainOptions,
  setConfirmBrain,
  setBrainDropdownOpen,
  handleStartConversation,
  setCopied,
  addToCampaignEligible,
  campaignButtonRef,
  campaignDropdownOpen,
  handleCampaignDropdownToggle,
  campaignsLoading,
  movingToCampaign,
  campaignOptions,
  campaignDropdownPos,
  campaignAction,
  setCampaignAction,
  handleSelectCampaign,
}: {
  deliverable: MissionDeliverable
  onClose: () => void
  isTextType: boolean
  viewMode: ViewMode
  setViewMode: Dispatch<SetStateAction<ViewMode>>
  copied: boolean
  effectiveContent: string | null | undefined
  brainButtonRef: RefObject<HTMLButtonElement | null>
  brainDropdownOpen: boolean
  handleBrainDropdownToggle: () => void
  brainsLoading: boolean
  brainDropdownPos: { top: number; left: number; right: number }
  isMobileToolbar: boolean
  brainOptions: BrainOption[]
  setConfirmBrain: (o: BrainOption | null) => void
  setBrainDropdownOpen: Dispatch<SetStateAction<boolean>>
  handleStartConversation: () => void
  setCopied: (v: boolean) => void
  addToCampaignEligible: boolean
  campaignButtonRef: RefObject<HTMLButtonElement | null>
  campaignDropdownOpen: boolean
  handleCampaignDropdownToggle: () => void
  campaignsLoading: boolean
  movingToCampaign: boolean
  campaignOptions: CampaignPickerOption[]
  campaignDropdownPos: { top: number; left: number; right: number }
  campaignAction: CampaignToCampaignAction
  setCampaignAction: Dispatch<SetStateAction<CampaignToCampaignAction>>
  handleSelectCampaign: (campaignId: string) => void
}) {
  return (
    <div className="gap-spacing-2 flex shrink-0 items-center overflow-visible">
      {isTextType && (
        <>
          <Tooltip label={viewMode === 'a4' ? 'Wide view' : 'A4 view'} side="top">
            <button
              type="button"
              onClick={() => setViewMode((m) => (m === 'wide' ? 'a4' : 'wide'))}
              className={`btn-icon-bare ${viewMode === 'a4' ? 'bg-primary/10' : ''}`}
            >
              {viewMode === 'a4' ? (
                <FileText className="icon-sm" />
              ) : (
                <Monitor className="icon-sm" />
              )}
            </button>
          </Tooltip>
        </>
      )}
      {!isTextType && (
        <DeliverablePreviewToolbarFileActions
          deliverable={deliverable}
          copied={copied}
          setCopied={setCopied}
        />
      )}
      <DeliverablePreviewToolbarCampaignMenu
        addToCampaignEligible={addToCampaignEligible}
        campaignButtonRef={campaignButtonRef}
        campaignDropdownOpen={campaignDropdownOpen}
        handleCampaignDropdownToggle={handleCampaignDropdownToggle}
        campaignsLoading={campaignsLoading}
        movingToCampaign={movingToCampaign}
        campaignOptions={campaignOptions}
        campaignDropdownPos={campaignDropdownPos}
        isMobileToolbar={isMobileToolbar}
        campaignAction={campaignAction}
        setCampaignAction={setCampaignAction}
        handleSelectCampaign={handleSelectCampaign}
      />
      <DeliverablePreviewToolbarBrainMenu
        effectiveContent={effectiveContent}
        brainButtonRef={brainButtonRef}
        brainDropdownOpen={brainDropdownOpen}
        handleBrainDropdownToggle={handleBrainDropdownToggle}
        brainsLoading={brainsLoading}
        brainDropdownPos={brainDropdownPos}
        isMobileToolbar={isMobileToolbar}
        brainOptions={brainOptions}
        setConfirmBrain={setConfirmBrain}
        setBrainDropdownOpen={setBrainDropdownOpen}
      />
      {effectiveContent && (
        <Tooltip label="Discuss with ROAS" side="top">
          <button type="button" onClick={handleStartConversation} className="btn-icon-bare">
            <MessageSquarePlus className="icon-sm" />
          </button>
        </Tooltip>
      )}
      <button type="button" onClick={onClose} className="btn-icon-bare">
        <X className="icon-sm" />
      </button>
    </div>
  )
}
