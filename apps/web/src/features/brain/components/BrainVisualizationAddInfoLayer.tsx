'use client'

import { Plus } from 'lucide-react'
import CampaignAddInfoPanel from './CampaignAddInfoPanel'
import CustomerAddInfoPanel from './CustomerAddInfoPanel'
import UserAddInfoPanel from './UserAddInfoPanel'

type BrainAddInfoScope = {
  brainId?: string | null
  campaignId?: string | null
  scopeType?: string | null
}

interface BrainVisualizationAddInfoLayerProps {
  isMobileBrain: boolean
  onCampaignImported: () => Promise<void> | void
  selectedScope?: BrainAddInfoScope | null
  topRightScopeReady: boolean
}

export function BrainVisualizationAddInfoLayer({
  isMobileBrain,
  onCampaignImported,
  selectedScope,
  topRightScopeReady,
}: BrainVisualizationAddInfoLayerProps) {
  const handleMobileAddInfo = () => {
    window.dispatchEvent(new CustomEvent('mobile-brain-add-info'))
  }

  return (
    <>
      <div className="top-spacing-4 left-spacing-4 right-spacing-4 pointer-events-none absolute z-40 hidden justify-end gap-2 md:flex">
        <div className="pointer-events-auto flex shrink-0 items-start">
          {topRightScopeReady ? (
            <>
              <UserAddInfoPanel
                visible={selectedScope?.scopeType === 'user' && selectedScope?.brainId == null}
              />
              <CampaignAddInfoPanel
                visible={selectedScope?.scopeType === 'campaign'}
                campaignId={selectedScope?.campaignId ?? null}
                onImported={onCampaignImported}
              />
              <CustomerAddInfoPanel
                visible={selectedScope?.scopeType === 'customer' && selectedScope?.brainId == null}
                brainId={selectedScope?.brainId ?? null}
              />
            </>
          ) : null}
        </div>
      </div>

      {isMobileBrain ? (
        <div className="absolute inset-x-0 bottom-4 z-40 flex justify-center md:hidden">
          <button
            type="button"
            onClick={handleMobileAddInfo}
            className="chip-glass-blue flex items-center gap-2 rounded-full px-4 py-2.5 shadow-lg"
          >
            <Plus className="h-4 w-4" />
            <span className="body-2 font-medium">Add Information</span>
          </button>
        </div>
      ) : null}
    </>
  )
}
