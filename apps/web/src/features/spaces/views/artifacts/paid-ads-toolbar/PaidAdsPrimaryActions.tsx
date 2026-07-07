'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { LayoutGrid, Plus, Rocket } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import { ARTIFACT_SLIDE_PREVIEW_TOOLBAR_MOTION } from '@/lib/ui/toolbar-motion'
import type { PaidAdsHierarchyMode } from '@/features/spaces/types/space-schema'
import { PaidAdsPublishFlow } from '../../../components/artifacts/paid-ads/PaidAdsPublishFlow'
import {
  PAID_ADS_OPEN_CANVAS_REQUEST_EVENT,
  PAID_ADS_SELECTION_EVENT,
  type PaidAdsSelectionEventDetail,
} from '../../../components/artifacts/paid-ads/use-paid-ads-data'
import { SpaceCustomizeButton } from '../../../components/toolbar'

export function PaidAdsPrimaryActions({
  hierarchyMode,
  campaignId,
  createLabel,
  schemaEditorOpen,
  closeCustomizePanel,
  openCustomizeFromToolbar,
  loadCampaignArtifacts,
  handleCreateArtifact,
}: {
  hierarchyMode: PaidAdsHierarchyMode
  campaignId: string | null
  createLabel: string
  schemaEditorOpen: boolean
  closeCustomizePanel: () => void
  openCustomizeFromToolbar: (initial?: 'main' | 'fields' | 'people' | 'ig_format') => void
  loadCampaignArtifacts: () => void
  handleCreateArtifact: () => Promise<void> | void
}) {
  const isStructureMode = hierarchyMode === 'structure'
  const [publishReviewOpen, setPublishReviewOpen] = useState(false)
  const [openCanvasReady, setOpenCanvasReady] = useState(false)

  useEffect(() => {
    if (!isStructureMode) {
      setOpenCanvasReady(false)
      return
    }
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<PaidAdsSelectionEventDetail>).detail
      if (detail?.campaignId !== campaignId) return
      const selection = detail.selection
      setOpenCanvasReady(
        selection.kind === 'ad_set' || (selection.kind === 'ad' && selection.adSetId != null),
      )
    }
    window.addEventListener(PAID_ADS_SELECTION_EVENT, handler)
    return () => window.removeEventListener(PAID_ADS_SELECTION_EVENT, handler)
  }, [isStructureMode, campaignId])

  const requestOpenCanvas = () => {
    window.dispatchEvent(
      new CustomEvent(PAID_ADS_OPEN_CANVAS_REQUEST_EVENT, {
        detail: { campaignId: campaignId ?? null },
      }),
    )
  }

  return (
    <>
      <motion.div
        key="paid-ads-toolbar-custom-plus"
        className="flex shrink-0 flex-wrap items-center gap-1"
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 28 }}
        transition={ARTIFACT_SLIDE_PREVIEW_TOOLBAR_MOTION}
      >
        <SpaceCustomizeButton
          schemaEditorOpen={schemaEditorOpen}
          closeCustomizePanel={closeCustomizePanel}
          openCustomizeFromToolbar={openCustomizeFromToolbar}
        />
        {isStructureMode ? (
          <div className="relative inline-flex h-spacing-8 items-center overflow-hidden">
            <AnimatePresence mode="popLayout" initial={false}>
              {openCanvasReady ? (
                <motion.span
                  key="paid-ads-toolbar-open-canvas"
                  className="inline-flex"
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={ARTIFACT_SLIDE_PREVIEW_TOOLBAR_MOTION}
                >
                  <Tooltip label="Open creative canvas" side="bottom">
                    <span className="inline-flex">
                      <button
                        type="button"
                        onClick={() => requestOpenCanvas()}
                        className="badge-glass badge-glass-green body-3 rounded-spacing-2 inline-flex shrink-0 items-center gap-spacing-1 px-spacing-3 py-spacing-2 font-semibold transition-opacity hover:opacity-90"
                      >
                        <LayoutGrid className="icon-sm shrink-0" />
                        Open canvas
                      </button>
                    </span>
                  </Tooltip>
                </motion.span>
              ) : (
                <motion.span
                  key="paid-ads-toolbar-publish"
                  className="inline-flex"
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={ARTIFACT_SLIDE_PREVIEW_TOOLBAR_MOTION}
                >
                  <Tooltip
                    label={campaignId ? 'Publish ad campaign to Meta' : 'Paid ads require a campaign'}
                    side="bottom"
                  >
                    <span className="inline-flex">
                      <button
                        type="button"
                        disabled={!campaignId}
                        onClick={() => setPublishReviewOpen(true)}
                        className="badge-glass badge-glass-green body-3 rounded-spacing-2 inline-flex shrink-0 items-center gap-spacing-1 px-spacing-3 py-spacing-2 font-semibold transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-40"
                      >
                        <Rocket className="icon-sm shrink-0" />
                        Publish
                      </button>
                    </span>
                  </Tooltip>
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <Tooltip
            label={campaignId ? `New ${createLabel.toLowerCase()}` : 'Paid ads require a campaign'}
            side="bottom"
          >
            <span className="inline-flex">
              <button
                type="button"
                disabled={!campaignId}
                onClick={() => {
                  loadCampaignArtifacts()
                  void handleCreateArtifact()
                }}
                className="badge-glass badge-glass-green body-3 rounded-spacing-2 inline-flex shrink-0 items-center gap-spacing-1 px-spacing-3 py-spacing-2 font-semibold transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-40"
              >
                <Plus className="icon-sm shrink-0" />
                {createLabel}
              </button>
            </span>
          </Tooltip>
        )}
      </motion.div>
      {isStructureMode && campaignId ? (
        <PaidAdsPublishFlow
          platformCampaignId={campaignId}
          reviewOpen={publishReviewOpen}
          onReviewClose={() => setPublishReviewOpen(false)}
        />
      ) : null}
    </>
  )
}
