'use client'

import type { ComponentProps, Dispatch, ReactNode, SetStateAction } from 'react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import type { Funnel } from '../../../services/artifact-preview.service'
import type { Presentation } from '../../../types'
import { ThemeSettings, type ThemeNavTab } from '../../settings'
import { AdsSettingsSection } from './ads-settings-section'
import { AgentSettingsSection } from './agent-settings-section'
import { DangerSettingsSection } from './danger-settings-section'
import { FunnelSettingsSection } from './funnel-settings-section'
import { PresentationSettingsSection } from './presentation-settings-section'
import type { SettingsSection } from './settings-tab.types'
import type { usePresentationPixelControls } from './use-presentation-pixel-controls'
import type { useSettingsTabAgentThemeControls } from './use-settings-tab-agent-theme-controls'
import type { useSettingsTabDomainControls } from './use-settings-tab-domain-controls'
import type { useSettingsTabEntityControls } from './use-settings-tab-entity-controls'
import type { useSettingsTabMetaAssets } from './use-settings-tab-meta-assets'
import { WebsiteSettingsSection } from './website-settings-section'

type AgentThemeControls = ReturnType<typeof useSettingsTabAgentThemeControls>
type EntityControls = ReturnType<typeof useSettingsTabEntityControls>
type DomainControls = ReturnType<typeof useSettingsTabDomainControls>
type PixelControls = ReturnType<typeof usePresentationPixelControls>
type MetaAssets = ReturnType<typeof useSettingsTabMetaAssets>

export interface SettingsTabContentProps {
  activeSection: SettingsSection
  settingsLoading: boolean
  campaignId: string
  mobileMode?: boolean
  campaignConfig: Record<string, unknown>
  setCampaignConfig: Dispatch<SetStateAction<Record<string, unknown>>>
  mediaGenerationEnabled: boolean
  campaignModelStrategy: string
  modelStrategies: ComponentProps<typeof AgentSettingsSection>['modelStrategies']
  userIntegrations: ComponentProps<typeof AgentSettingsSection>['userIntegrations']
  providerModes: ComponentProps<typeof AgentSettingsSection>['providerModes']
  availableIntegrations: ComponentProps<typeof AgentSettingsSection>['availableIntegrations']
  loadUserIntegrations: ComponentProps<typeof AgentSettingsSection>['loadUserIntegrations']
  selectedThemeId: string | null
  themeTab: ThemeNavTab
  setThemeTab: (tab: ThemeNavTab) => void
  displayFunnels: Funnel[]
  setFunnels: Dispatch<SetStateAction<Funnel[]>>
  presentations: Presentation[]
  setPresentations: Dispatch<SetStateAction<Presentation[]>>
  displayWebsites: Funnel[]
  isFreeUser: boolean
  metaConnectionCard: ReactNode
  openWorkspaceSettings: (section: 'domains') => void
  activeCampaignName: string | null
  deleteDialogOpen: boolean
  deleteCampaignAck: boolean
  deleteCampaignNameInput: string
  isDeletingCampaign: boolean
  setDeleteDialogOpen: (open: boolean) => void
  setDeleteCampaignAck: (acknowledged: boolean) => void
  setDeleteCampaignNameInput: (value: string) => void
  onDeleteCampaign: () => Promise<void> | void
  agentThemeControls: AgentThemeControls
  entityControls: EntityControls
  domainControls: DomainControls
  pixelControls: PixelControls
  metaAssets: MetaAssets
}

export function SettingsTabContent({
  activeSection,
  settingsLoading,
  campaignId,
  mobileMode,
  campaignConfig,
  setCampaignConfig,
  mediaGenerationEnabled,
  campaignModelStrategy,
  modelStrategies,
  userIntegrations,
  providerModes,
  availableIntegrations,
  loadUserIntegrations,
  selectedThemeId,
  themeTab,
  setThemeTab,
  displayFunnels,
  setFunnels,
  presentations,
  setPresentations,
  displayWebsites,
  isFreeUser,
  metaConnectionCard,
  openWorkspaceSettings,
  activeCampaignName,
  deleteDialogOpen,
  deleteCampaignAck,
  deleteCampaignNameInput,
  isDeletingCampaign,
  setDeleteDialogOpen,
  setDeleteCampaignAck,
  setDeleteCampaignNameInput,
  onDeleteCampaign,
  agentThemeControls,
  entityControls,
  domainControls,
  pixelControls,
  metaAssets,
}: SettingsTabContentProps) {
  const {
    savingAgentSettings,
    handleMediaGenerationToggle,
    handleModelStrategyChange,
    handleThemeChange,
  } = agentThemeControls
  const {
    savingFunnelIds,
    activeFunnelIndex,
    setActiveFunnelIndex,
    editingFunnelId,
    draftFunnelName,
    setDraftFunnelName,
    funnelContainerRef,
    funnelNameInputRef,
    handleStartEditFunnelName,
    handleCancelEditFunnelName,
    handleCommitEditFunnelName,
    savingPresentationIds,
    activePresentationIndex,
    setActivePresentationIndex,
    editingPresentationId,
    draftPresentationName,
    setDraftPresentationName,
    presentationContainerRef,
    presentationNameInputRef,
    handleStartEditPresentationName,
    handleCancelEditPresentationName,
    handleCommitEditPresentationName,
    handleTogglePresentationBranding,
    activeWebsiteIndex,
    setActiveWebsiteIndex,
    editingWebsiteId,
    draftWebsiteName,
    setDraftWebsiteName,
    savingWebsiteIds,
    websiteContainerRef,
    websiteNameInputRef,
    handleStartEditWebsiteName,
    handleCancelEditWebsiteName,
    handleCommitEditWebsiteName,
    handleSaveWebsiteLayout,
  } = entityControls
  const {
    domains,
    setDomains,
    domainsLoading,
    selectedDomainId,
    setSelectedDomainId,
    lmDomainActionLoading,
    setLmDomainActionLoading,
    lmSelectedDomainId,
    setLmSelectedDomainId,
    lmDomainDropdownOpen,
    setLmDomainDropdownOpen,
    lmDomainDropdownTriggerRef,
    lmDomainDropdownPos,
    setAddDomainOpen,
  } = domainControls
  const {
    lmPixelSaving,
    lmPixelAddFlow,
    setLmPixelAddFlow,
    handleUpdatePresentationPixels,
    handleUpdatePresentationMetaEvents,
  } = pixelControls
  const {
    adCampaigns,
    setAdCampaigns,
    metaConnected,
    metaAdAccounts,
    metaPages,
    metaInstagramAccountsByCampaign,
    setMetaInstagramAccountsByCampaign,
    metaPixelsByAccount,
    setMetaPixelsByAccount,
    adsSaving,
    setAdsSaving,
    setCreatePixelForAccountId,
    setCreatePixelForCampaignId,
  } = metaAssets

  return (
    <div
      className={
        mobileMode
          ? 'flex min-h-0 flex-1 flex-col overflow-y-auto p-4'
          : 'flex min-h-0 flex-1 flex-col overflow-y-auto p-6'
      }
    >
      {activeSection === 'agent' &&
        (settingsLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <VibeyLoadingOrb size="sm" text="Loading settings..." />
          </div>
        ) : (
          <AgentSettingsSection
            campaignId={campaignId}
            mediaGenerationEnabled={mediaGenerationEnabled}
            savingAgentSettings={savingAgentSettings}
            onMediaGenerationToggle={handleMediaGenerationToggle}
            campaignModelStrategy={campaignModelStrategy}
            onModelStrategyChange={handleModelStrategyChange}
            modelStrategies={modelStrategies}
            userIntegrations={userIntegrations}
            providerModes={providerModes}
            availableIntegrations={availableIntegrations}
            loadUserIntegrations={loadUserIntegrations}
          />
        ))}

      {activeSection === 'theme' &&
        (settingsLoading ? (
          <div className="flex min-h-[min(60vh,480px)] flex-1 items-center justify-center">
            <VibeyLoadingOrb size="sm" text="Loading theme settings..." />
          </div>
        ) : (
          <div className="flex min-h-[min(60vh,480px)] min-w-0 flex-1 flex-col">
            <div className="max-w-xl">
              <ThemeSettings
                value={selectedThemeId}
                onChange={(id) => void handleThemeChange(id)}
                initialTab={themeTab}
                onTabChange={setThemeTab}
                showInlineTabs={mobileMode}
              />
            </div>
          </div>
        ))}

      {activeSection === 'funnel' &&
        (settingsLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <VibeyLoadingOrb size="sm" text="Loading funnel settings..." />
          </div>
        ) : (
          <FunnelSettingsSection
            campaignId={campaignId}
            funnels={displayFunnels}
            activeIndex={activeFunnelIndex}
            setActiveIndex={setActiveFunnelIndex}
            editingId={editingFunnelId}
            draftName={draftFunnelName}
            setDraftName={setDraftFunnelName}
            onStartEdit={handleStartEditFunnelName}
            onCommitEdit={handleCommitEditFunnelName}
            onCancelEdit={handleCancelEditFunnelName}
            onFunnelChange={(next) =>
              setFunnels((prev) => prev.map((f) => (f.id === next.id ? next : f)))
            }
            savingIds={savingFunnelIds}
            containerRef={funnelContainerRef}
            nameInputRef={funnelNameInputRef}
            isFreeUser={isFreeUser}
            domains={domains}
            setDomains={setDomains}
            domainsLoading={domainsLoading}
            metaPixelsByAccount={metaPixelsByAccount}
            adCampaigns={adCampaigns}
            onOpenDomainsWorkspace={() => openWorkspaceSettings('domains')}
            onOpenAddDomain={() => setAddDomainOpen(true)}
            selectedDomainId={selectedDomainId}
            setSelectedDomainId={setSelectedDomainId}
          />
        ))}

      {activeSection === 'presentation' &&
        (settingsLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <VibeyLoadingOrb size="sm" text="Loading presentation settings..." />
          </div>
        ) : (
          <PresentationSettingsSection
            presentations={presentations}
            activePresentationIndex={activePresentationIndex}
            setActivePresentationIndex={setActivePresentationIndex}
            savingPresentationIds={savingPresentationIds}
            editingPresentationId={editingPresentationId}
            draftPresentationName={draftPresentationName}
            setDraftPresentationName={setDraftPresentationName}
            presentationContainerRef={presentationContainerRef}
            presentationNameInputRef={presentationNameInputRef}
            handleStartEditPresentationName={handleStartEditPresentationName}
            handleCommitEditPresentationName={handleCommitEditPresentationName}
            handleCancelEditPresentationName={handleCancelEditPresentationName}
            handleTogglePresentationBranding={handleTogglePresentationBranding}
            domains={domains}
            domainsLoading={domainsLoading}
            selectedDomainId={lmSelectedDomainId}
            setSelectedDomainId={setLmSelectedDomainId}
            domainDropdownOpen={lmDomainDropdownOpen}
            setDomainDropdownOpen={setLmDomainDropdownOpen}
            domainDropdownTriggerRef={lmDomainDropdownTriggerRef}
            domainDropdownPos={lmDomainDropdownPos}
            domainActionLoading={lmDomainActionLoading}
            setDomainActionLoading={setLmDomainActionLoading}
            setAddDomainOpen={setAddDomainOpen}
            setPresentations={setPresentations}
            onOpenDomainsWorkspace={openWorkspaceSettings}
            isFreeUser={isFreeUser}
            pixelSaving={lmPixelSaving}
            pixelAddFlow={lmPixelAddFlow}
            setPixelAddFlow={setLmPixelAddFlow}
            allMetaPixelOptions={metaAssets.allMetaPixelOptions}
            onUpdatePixels={handleUpdatePresentationPixels}
            onUpdateMetaEvents={handleUpdatePresentationMetaEvents}
          />
        ))}

      {activeSection === 'website' &&
        (settingsLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <VibeyLoadingOrb size="sm" text="Loading website settings..." />
          </div>
        ) : (
          <WebsiteSettingsSection
            websites={displayWebsites}
            activeIndex={activeWebsiteIndex}
            setActiveIndex={setActiveWebsiteIndex}
            editingId={editingWebsiteId}
            draftName={draftWebsiteName}
            setDraftName={setDraftWebsiteName}
            onStartEdit={handleStartEditWebsiteName}
            onCommitEdit={handleCommitEditWebsiteName}
            onCancelEdit={handleCancelEditWebsiteName}
            onSaveLayout={handleSaveWebsiteLayout}
            savingIds={savingWebsiteIds}
            containerRef={websiteContainerRef}
            nameInputRef={websiteNameInputRef}
            campaignId={campaignId}
            themeId={selectedThemeId}
          />
        ))}

      {activeSection === 'ads' &&
        (settingsLoading ? (
          <div className="flex h-full min-h-[400px] w-full flex-1 items-center justify-center">
            <VibeyLoadingOrb size="sm" state="processing" text="Loading ads settings..." />
          </div>
        ) : (
          <AdsSettingsSection
            metaConnected={metaConnected}
            metaConnectionCard={metaConnectionCard}
            campaignId={campaignId}
            campaignConfig={campaignConfig}
            setCampaignConfig={setCampaignConfig}
            adCampaigns={adCampaigns}
            setAdCampaigns={setAdCampaigns}
            metaAdAccounts={metaAdAccounts}
            metaPages={metaPages}
            metaInstagramAccountsByCampaign={metaInstagramAccountsByCampaign}
            setMetaInstagramAccountsByCampaign={setMetaInstagramAccountsByCampaign}
            metaPixelsByAccount={metaPixelsByAccount}
            setMetaPixelsByAccount={setMetaPixelsByAccount}
            adsSaving={adsSaving}
            setAdsSaving={setAdsSaving}
            setCreatePixelForAccountId={setCreatePixelForAccountId}
            setCreatePixelForCampaignId={setCreatePixelForCampaignId}
          />
        ))}

      {activeSection === 'danger' && (
        <DangerSettingsSection
          activeCampaignName={activeCampaignName}
          deleteDialogOpen={deleteDialogOpen}
          deleteCampaignAck={deleteCampaignAck}
          deleteCampaignNameInput={deleteCampaignNameInput}
          isDeletingCampaign={isDeletingCampaign}
          setDeleteDialogOpen={setDeleteDialogOpen}
          setDeleteCampaignAck={setDeleteCampaignAck}
          setDeleteCampaignNameInput={setDeleteCampaignNameInput}
          onDeleteCampaign={onDeleteCampaign}
        />
      )}
    </div>
  )
}
