'use client'

import type { Dispatch, RefObject, SetStateAction } from 'react'
import type { Presentation } from '@/lib/artifacts/artifact-types'
import type { FunnelPixelEntry } from '../funnel-settings/funnel-pixel-utils'
import { PresentationBrandingSection } from './presentation-branding-section'
import { PresentationDomainSection, type PresentationDomainOption } from './presentation-domain-section'
import { PresentationPixelEventsSection } from './presentation-pixel-events-section'
import { PresentationSettingsHeader } from './presentation-settings-header'

type MetaPixelOption = {
  value: string
  label: string
}

interface PresentationSettingsSectionProps {
  presentations: Presentation[]
  activePresentationIndex: number
  setActivePresentationIndex: Dispatch<SetStateAction<number>>
  savingPresentationIds: Set<string>
  editingPresentationId: string | null
  draftPresentationName: string
  setDraftPresentationName: (name: string) => void
  presentationContainerRef: RefObject<HTMLDivElement | null>
  presentationNameInputRef: RefObject<HTMLInputElement | null>
  handleStartEditPresentationName: (presentation: Presentation) => void
  handleCommitEditPresentationName: (presentation: Presentation) => Promise<void>
  handleCancelEditPresentationName: () => void
  handleTogglePresentationBranding: (presentationId: string, hideBranding: boolean) => Promise<void> | void
  domains: PresentationDomainOption[]
  domainsLoading: boolean
  selectedDomainId: string
  setSelectedDomainId: (domainId: string) => void
  domainDropdownOpen: boolean
  setDomainDropdownOpen: Dispatch<SetStateAction<boolean>>
  domainDropdownTriggerRef: RefObject<HTMLButtonElement | null>
  domainDropdownPos: { top: number; left: number; width: number }
  domainActionLoading: boolean
  setDomainActionLoading: (loading: boolean) => void
  setAddDomainOpen: (open: boolean) => void
  setPresentations: Dispatch<SetStateAction<Presentation[]>>
  onOpenDomainsWorkspace: (section: 'domains') => void
  isFreeUser: boolean
  pixelSaving: boolean
  pixelAddFlow: string
  setPixelAddFlow: (mode: string) => void
  allMetaPixelOptions: MetaPixelOption[]
  onUpdatePixels: (presentationId: string, pixels: FunnelPixelEntry[]) => Promise<void> | void
  onUpdateMetaEvents: (presentationId: string, events: Record<string, string>) => Promise<void> | void
}

export function PresentationSettingsSection({
  presentations,
  activePresentationIndex,
  setActivePresentationIndex,
  savingPresentationIds,
  editingPresentationId,
  draftPresentationName,
  setDraftPresentationName,
  presentationContainerRef,
  presentationNameInputRef,
  handleStartEditPresentationName,
  handleCommitEditPresentationName,
  handleCancelEditPresentationName,
  handleTogglePresentationBranding,
  domains,
  domainsLoading,
  selectedDomainId,
  setSelectedDomainId,
  domainDropdownOpen,
  setDomainDropdownOpen,
  domainDropdownTriggerRef,
  domainDropdownPos,
  domainActionLoading,
  setDomainActionLoading,
  setAddDomainOpen,
  setPresentations,
  onOpenDomainsWorkspace,
  isFreeUser,
  pixelSaving,
  pixelAddFlow,
  setPixelAddFlow,
  allMetaPixelOptions,
  onUpdatePixels,
  onUpdateMetaEvents,
}: PresentationSettingsSectionProps) {
  const clampedIndex = Math.min(activePresentationIndex, presentations.length - 1)
  const presentation = presentations[clampedIndex]

  if (!presentation) return null

  const isSaving = savingPresentationIds.has(presentation.id)
  const goPrevious = () => setActivePresentationIndex((index) => Math.max(0, index - 1))
  const goNext = () =>
    setActivePresentationIndex((index) => Math.min(presentations.length - 1, index + 1))

  return (
    <div
      ref={presentationContainerRef}
      tabIndex={0}
      onKeyDown={(event) => {
        if (
          event.target instanceof HTMLInputElement ||
          event.target instanceof HTMLTextAreaElement
        ) {
          return
        }
        if (event.key === 'ArrowLeft') {
          event.preventDefault()
          goPrevious()
        }
        if (event.key === 'ArrowRight') {
          event.preventDefault()
          goNext()
        }
      }}
      className="space-y-spacing-6 outline-none"
    >
      <PresentationSettingsHeader
        presentation={presentation}
        presentationIndex={clampedIndex}
        presentationsCount={presentations.length}
        isSaving={isSaving}
        editingId={editingPresentationId}
        draftName={draftPresentationName}
        setDraftName={setDraftPresentationName}
        onStartEdit={handleStartEditPresentationName}
        onCommitEdit={handleCommitEditPresentationName}
        onCancelEdit={handleCancelEditPresentationName}
        onPrevious={goPrevious}
        onNext={goNext}
        onSelectPresentation={setActivePresentationIndex}
        nameInputRef={presentationNameInputRef}
      />

      <PresentationDomainSection
        presentation={presentation}
        domains={domains}
        domainsLoading={domainsLoading}
        selectedDomainId={selectedDomainId}
        setSelectedDomainId={setSelectedDomainId}
        domainDropdownOpen={domainDropdownOpen}
        setDomainDropdownOpen={setDomainDropdownOpen}
        domainDropdownTriggerRef={domainDropdownTriggerRef}
        domainDropdownPos={domainDropdownPos}
        domainActionLoading={domainActionLoading}
        setDomainActionLoading={setDomainActionLoading}
        setAddDomainOpen={setAddDomainOpen}
        setPresentations={setPresentations}
        onOpenDomainsWorkspace={onOpenDomainsWorkspace}
      />

      <PresentationBrandingSection
        presentation={presentation}
        isSaving={isSaving}
        isFreeUser={isFreeUser}
        onToggleBranding={handleTogglePresentationBranding}
      />

      <PresentationPixelEventsSection
        presentation={presentation}
        pixelSaving={pixelSaving}
        pixelAddFlow={pixelAddFlow}
        setPixelAddFlow={setPixelAddFlow}
        allMetaPixelOptions={allMetaPixelOptions}
        onUpdatePixels={onUpdatePixels}
        onUpdateMetaEvents={onUpdateMetaEvents}
      />
    </div>
  )
}
