'use client'

import type { RefObject, SetStateAction } from 'react'
import { ChevronLeft, ChevronRight, Filter } from 'lucide-react'
import type { Funnel } from '@/features/studio/services/artifact-preview.service'
import type { AdCampaign } from '@/features/studio/types'
import {
  FunnelSettingsSections,
  type FunnelSettingsSectionsProps,
} from '../funnel-settings'

type SetActiveIndex = (value: SetStateAction<number>) => void

export function FunnelSettingsSection({
  campaignId,
  funnels,
  activeIndex,
  setActiveIndex,
  editingId,
  draftName,
  setDraftName,
  onStartEdit,
  onCommitEdit,
  onCancelEdit,
  onFunnelChange,
  savingIds,
  containerRef,
  nameInputRef,
  isFreeUser,
  domains,
  setDomains,
  domainsLoading,
  metaPixelsByAccount,
  adCampaigns,
  onOpenDomainsWorkspace,
  onOpenAddDomain,
  selectedDomainId,
  setSelectedDomainId,
}: {
  campaignId: string
  funnels: Funnel[]
  activeIndex: number
  setActiveIndex: SetActiveIndex
  editingId: string | null
  draftName: string
  setDraftName: (value: string) => void
  onStartEdit: (funnel: Funnel) => void
  onCommitEdit: (funnel: Funnel) => Promise<void>
  onCancelEdit: () => void
  onFunnelChange: (next: Funnel) => void
  savingIds: Set<string>
  containerRef: RefObject<HTMLDivElement | null>
  nameInputRef: RefObject<HTMLInputElement | null>
  isFreeUser: boolean
  domains: FunnelSettingsSectionsProps['domains']
  setDomains: FunnelSettingsSectionsProps['setDomains']
  domainsLoading: boolean
  metaPixelsByAccount: Record<string, Array<{ id: string; name: string }>>
  adCampaigns: AdCampaign[]
  onOpenDomainsWorkspace: () => void
  onOpenAddDomain: () => void
  selectedDomainId: string
  setSelectedDomainId: FunnelSettingsSectionsProps['setSelectedDomainId']
}) {
  const funnel = funnels.length > 0 ? funnels[Math.min(activeIndex, funnels.length - 1)] : null
  const clampedIndex = funnels.length > 0 ? Math.min(activeIndex, funnels.length - 1) : 0

  if (!funnel) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
        <Filter className="text-muted-foreground/30 h-8 w-8" />
        <p className="body-3 text-muted-foreground">No funnels yet</p>
        <p className="typo-caption text-muted-foreground">
          Create a funnel in the Artifacts tab to configure its settings here.
        </p>
      </div>
    )
  }

  const isSaving = savingIds.has(funnel.id)
  const goPrev = () => setActiveIndex((index) => Math.max(0, index - 1))
  const goNext = () => setActiveIndex((index) => Math.min(funnels.length - 1, index + 1))

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)
          return
        if (event.key === 'ArrowLeft') {
          event.preventDefault()
          goPrev()
        }
        if (event.key === 'ArrowRight') {
          event.preventDefault()
          goNext()
        }
      }}
      className="space-y-spacing-6 outline-none"
    >
      <div className="space-y-spacing-3">
        <div className="flex flex-col items-center text-center">
          {editingId === funnel.id ? (
            <input
              ref={nameInputRef}
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void onCommitEdit(funnel)
                if (event.key === 'Escape') onCancelEdit()
                event.stopPropagation()
              }}
              onBlur={() => void onCommitEdit(funnel)}
              className="title-h6 text-foreground ring-primary/50 rounded-md bg-transparent px-2 py-1 text-center outline-none ring-1 focus:ring-primary"
            />
          ) : (
            <button
              type="button"
              onClick={() => onStartEdit(funnel)}
              className="title-h6 text-foreground hover:text-foreground/90 transition-colors"
              title="Click to edit funnel name"
            >
              {funnel.name}
            </button>
          )}
          {isSaving && <span className="body-3 text-muted-foreground">Saving...</span>}
        </div>

        <div className="gap-spacing-3 flex items-center justify-center">
          <span
            className={`badge-glass badge-glass-sm ${
              funnel.status === 'published' ? 'badge-glass-green' : 'badge-glass-muted'
            }`}
          >
            {funnel.status === 'published' ? 'Published' : 'Draft'}
          </span>
          <span className="badge-glass badge-glass-sm badge-glass-muted">
            {funnel.funnel_type}
          </span>
        </div>

        {funnels.length > 1 && (
          <div className="gap-spacing-3 flex items-center justify-center">
            <button
              type="button"
              onClick={goPrev}
              disabled={clampedIndex === 0}
              className="p-spacing-1 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
            >
              <ChevronLeft className="icon-sm" />
            </button>

            <div className="gap-spacing-2 flex items-center">
              {funnels.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={`h-2.5 w-2.5 rounded-full transition-all ${
                    index === clampedIndex
                      ? 'step-circle-completed-purple scale-110'
                      : 'step-circle-default hover:scale-110'
                  }`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={goNext}
              disabled={clampedIndex === funnels.length - 1}
              className="p-spacing-1 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
            >
              <ChevronRight className="icon-sm" />
            </button>

            <span className="body-4 text-muted-foreground">
              {clampedIndex + 1} / {funnels.length}
            </span>
          </div>
        )}
      </div>

      <FunnelSettingsSections
        campaignId={campaignId}
        funnel={funnel}
        onFunnelChange={onFunnelChange}
        isFreeUser={isFreeUser}
        domains={domains}
        setDomains={setDomains}
        domainsLoading={domainsLoading}
        metaPixelsByAccount={metaPixelsByAccount}
        adCampaigns={adCampaigns}
        onOpenDomainsWorkspace={onOpenDomainsWorkspace}
        onOpenAddDomain={onOpenAddDomain}
        selectedDomainId={selectedDomainId}
        setSelectedDomainId={setSelectedDomainId}
      />
    </div>
  )
}
