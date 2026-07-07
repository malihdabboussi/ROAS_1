'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { AddCustomDomainDialog } from '@/components/domains/AddCustomDomainDialog'
import { CustomDomainDnsDialog } from '@/components/domains/CustomDomainDnsDialog'
import { MetaIntegrationConnectCard } from '@/components/integrations/MetaIntegrationConnectCard'
import { isModelStrategyId, MODEL_STRATEGIES } from '@/lib/agents/model-strategies'
import { useIntegrationOverview } from '@/lib/integrations/use-integration-overview'
import { useWorkspaceSettingsModal } from '@/lib/settings/workspace-settings-modal-context'
import { useCampaignMode } from '../../contexts/CampaignModeContext'
import {
  fetchMetaPixels,
  updateAdCampaign,
  type Funnel,
} from '../../services/artifact-preview.service'
import { deleteCampaign } from '../../services/campaign.service'
import type { Presentation } from '../../types'
import type { ThemeNavTab } from '../settings'
import { CreateMetaPixelDialog } from './CreateMetaPixelDialog'
import { SettingsTabContent } from './SettingsTab/settings-tab-content'
import { SettingsTabNavigation } from './SettingsTab/settings-tab-navigation'
import type { SettingsSection } from './SettingsTab/settings-tab.types'
import { usePresentationPixelControls } from './SettingsTab/use-presentation-pixel-controls'
import { useSettingsTabAgentThemeControls } from './SettingsTab/use-settings-tab-agent-theme-controls'
import { useSettingsTabDomainControls } from './SettingsTab/use-settings-tab-domain-controls'
import { useSettingsTabEntityControls } from './SettingsTab/use-settings-tab-entity-controls'
import { useSettingsTabLoadSettings } from './SettingsTab/use-settings-tab-load-settings'
import { useSettingsTabMetaAssets } from './SettingsTab/use-settings-tab-meta-assets'

interface SettingsTabProps {
  campaignId: string
  mobileMode?: boolean
  initialSection?: string
  initialFunnelId?: string
  hideSidebar?: boolean
}

export function SettingsTab({
  campaignId,
  mobileMode,
  initialSection,
  initialFunnelId,
  hideSidebar,
}: SettingsTabProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>(
    (initialSection as SettingsSection) || 'agent',
  )
  const [themeTab, setThemeTab] = useState<ThemeNavTab>('colors')
  const [campaignConfig, setCampaignConfig] = useState<Record<string, unknown>>({})
  const [mediaGenerationEnabled, setMediaGenerationEnabled] = useState(true)
  const [campaignModelStrategy, setCampaignModelStrategy] = useState<string>('auto')
  const normalizeCampaignModelStrategy = useCallback(
    (modelStrategy: string | undefined) => (isModelStrategyId(modelStrategy) ? modelStrategy : 'auto'),
    [],
  )
  const agentThemeControls = useSettingsTabAgentThemeControls({
    campaignId,
    campaignConfig,
    setCampaignConfig,
    mediaGenerationEnabled,
    setMediaGenerationEnabled,
    campaignModelStrategy,
    setCampaignModelStrategy,
  })
  const [isFreeUser, setIsFreeUser] = useState(true)
  const [funnels, setFunnels] = useState<Funnel[]>([])
  const [presentations, setPresentations] = useState<Presentation[]>([])

  const { activeCampaignName, setActiveCampaign } = useCampaignMode()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteCampaignAck, setDeleteCampaignAck] = useState(false)
  const [deleteCampaignNameInput, setDeleteCampaignNameInput] = useState('')
  const [isDeletingCampaign, setIsDeletingCampaign] = useState(false)

  const entityControls = useSettingsTabEntityControls({
    funnels,
    setFunnels,
    presentations,
    setPresentations,
  })
  const { activePresentationIndex, setActiveFunnelIndex } = entityControls

  const [metaConnecting, setMetaConnecting] = useState(false)
  const metaAssets = useSettingsTabMetaAssets({ activeSection, campaignConfig })
  const { settingsLoading } = useSettingsTabLoadSettings({
    campaignId,
    setCampaignConfig,
    setMediaGenerationEnabled,
    setCampaignModelStrategy,
    setIsFreeUser,
    setFunnels,
    setPresentations,
    setAdCampaigns: metaAssets.setAdCampaigns,
    setMetaConnected: metaAssets.setMetaConnected,
    setMetaAdAccounts: metaAssets.setMetaAdAccounts,
    setMetaPages: metaAssets.setMetaPages,
    normalizeModelStrategy: normalizeCampaignModelStrategy,
  })
  const {
    availableIntegrations,
    userIntegrations,
    connectIntegration,
    providerModes,
    loadData: loadUserIntegrations,
  } = useIntegrationOverview()
  const { openWorkspaceSettings } = useWorkspaceSettingsModal()
  const metaIntegration = availableIntegrations.find((i) => i.provider.toLowerCase() === 'meta')
  const metaIsComposioMode =
    metaIntegration &&
    metaIntegration.provider.toLowerCase() !== 'slack' &&
    String(providerModes[metaIntegration.provider.toLowerCase()] ?? '')
      .trim()
      .toLowerCase() === 'composio'

  /** Classic funnels only, same order as artifact tree (Funnels section) */
  const displayFunnels = useMemo(
    () => funnels.filter((f) => f.funnel_type !== 'website'),
    [funnels],
  )

  const activePresentation =
    presentations.length > 0
      ? presentations[Math.min(activePresentationIndex, presentations.length - 1)]
      : null
  const domainControls = useSettingsTabDomainControls({
    activeSection,
    activePresentationId: activePresentation?.id ?? null,
    activePresentationDomainId: activePresentation?.domain_id ?? null,
  })
  const pixelControls = usePresentationPixelControls({
    presentations,
    setPresentations,
    activePresentationId: activePresentation?.id,
  })

  const displayWebsites = useMemo(
    () => funnels.filter((f) => f.funnel_type === 'website'),
    [funnels],
  )

  const pendingFunnelIdRef = useRef<string | null>(initialFunnelId ?? null)

  useEffect(() => {
    if (initialFunnelId) pendingFunnelIdRef.current = initialFunnelId
  }, [initialFunnelId])

  useEffect(() => {
    const handler = (e: Event) => {
      const d = (e as CustomEvent).detail
      const section: SettingsSection | undefined =
        typeof d === 'string'
          ? (d as SettingsSection)
          : d && typeof d === 'object' && 'section' in d
            ? (d as { section: SettingsSection }).section
            : undefined
      const funnelId =
        typeof d === 'object' && d && 'funnelId' in d
          ? (d as { funnelId?: string }).funnelId
          : undefined
      if (section) setActiveSection(section)
      if (funnelId) pendingFunnelIdRef.current = funnelId
    }
    window.addEventListener('navigate-settings-section', handler)
    return () => window.removeEventListener('navigate-settings-section', handler)
  }, [])

  useEffect(() => {
    if (!pendingFunnelIdRef.current || funnels.length === 0) return
    const classic = funnels.filter((f) => f.funnel_type !== 'website')
    const idx = classic.findIndex((f) => f.id === pendingFunnelIdRef.current)
    if (idx >= 0) setActiveFunnelIndex(idx)
    pendingFunnelIdRef.current = null
  }, [funnels])

  // Funnel section is always accessible now (even with 0 funnels)

  useEffect(() => {
    if (hideSidebar) return
    if (activeSection === 'presentation' && presentations.length <= 1) {
      setActiveSection('agent')
    }
    if (activeSection === 'website' && displayWebsites.length === 0) {
      setActiveSection('agent')
    }
  }, [activeSection, presentations.length, displayWebsites.length, hideSidebar])

  // Ads section is always accessible now (even with 0 ad campaigns)

  const handleConfirmDeleteCampaign = useCallback(async () => {
    setIsDeletingCampaign(true)
    try {
      await deleteCampaign(campaignId)
      toast.success('Campaign deleted')
      setActiveCampaign(null, null, null)
    } catch {
      toast.error('Failed to delete campaign')
    } finally {
      setIsDeletingCampaign(false)
    }
  }, [campaignId, setActiveCampaign])

  const selectedThemeId =
    ((
      ((campaignConfig.agent_settings as Record<string, unknown> | undefined) ?? {}) as Record<
        string,
        unknown
      >
    ).theme_id as string | null | undefined) ?? null

  if (!campaignId) {
    return <div className="body-2 flex h-full items-center justify-center">Select a campaign</div>
  }

  return (
    <div
      className={
        hideSidebar
          ? 'flex h-full flex-col overflow-hidden'
          : mobileMode
            ? 'flex h-full flex-col overflow-hidden'
            : 'card-glass flex h-full overflow-hidden rounded-2xl'
      }
    >
      {!hideSidebar && (
        <SettingsTabNavigation
          mobileMode={mobileMode}
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          themeTab={themeTab}
          onThemeTabChange={setThemeTab}
          presentationsCount={presentations.length}
          websitesCount={displayWebsites.length}
          settingsLoading={settingsLoading}
        />
      )}

      <SettingsTabContent
        activeSection={activeSection}
        settingsLoading={settingsLoading}
        campaignId={campaignId}
        mobileMode={mobileMode}
        campaignConfig={campaignConfig}
        setCampaignConfig={setCampaignConfig}
        mediaGenerationEnabled={mediaGenerationEnabled}
        campaignModelStrategy={campaignModelStrategy}
        modelStrategies={MODEL_STRATEGIES}
        userIntegrations={userIntegrations}
        providerModes={providerModes}
        availableIntegrations={availableIntegrations}
        loadUserIntegrations={loadUserIntegrations}
        selectedThemeId={selectedThemeId}
        themeTab={themeTab}
        setThemeTab={setThemeTab}
        displayFunnels={displayFunnels}
        setFunnels={setFunnels}
        presentations={presentations}
        setPresentations={setPresentations}
        displayWebsites={displayWebsites}
        isFreeUser={isFreeUser}
        metaConnectionCard={
          metaIntegration ? (
            <MetaIntegrationConnectCard
              integration={metaIntegration}
              isComposioMode={!!metaIsComposioMode}
              onConnect={async (integration) => {
                setMetaConnecting(true)
                try {
                  await connectIntegration(integration)
                } catch (err) {
                  console.error('[SettingsTab] Meta connect failed:', err)
                  toast.error(
                    'Could not start Meta connection. Please try from Settings → Integrations.',
                  )
                  setMetaConnecting(false)
                }
              }}
              connecting={metaConnecting}
            />
          ) : null
        }
        openWorkspaceSettings={openWorkspaceSettings}
        activeCampaignName={activeCampaignName}
        deleteDialogOpen={deleteDialogOpen}
        deleteCampaignAck={deleteCampaignAck}
        deleteCampaignNameInput={deleteCampaignNameInput}
        isDeletingCampaign={isDeletingCampaign}
        setDeleteDialogOpen={setDeleteDialogOpen}
        setDeleteCampaignAck={setDeleteCampaignAck}
        setDeleteCampaignNameInput={setDeleteCampaignNameInput}
        onDeleteCampaign={handleConfirmDeleteCampaign}
        agentThemeControls={agentThemeControls}
        entityControls={entityControls}
        domainControls={domainControls}
        pixelControls={pixelControls}
        metaAssets={metaAssets}
      />

      <AddCustomDomainDialog
        isOpen={domainControls.addDomainOpen}
        onClose={() => domainControls.setAddDomainOpen(false)}
        onDomainAdded={domainControls.handleDomainAdded}
      />

      <CustomDomainDnsDialog
        domain={domainControls.dnsDialogDomain}
        onClose={() => domainControls.setDnsDialogDomain(null)}
        onDomainUpdated={domainControls.handleDomainUpdated}
      />

      {metaAssets.createPixelForAccountId && (
        <CreateMetaPixelDialog
          isOpen
          adAccountId={metaAssets.createPixelForAccountId}
          onClose={() => {
            metaAssets.setCreatePixelForAccountId(null)
            metaAssets.setCreatePixelForCampaignId(null)
          }}
          onCreated={async (pixel) => {
            const accountId = metaAssets.createPixelForAccountId
            if (!accountId) return
            const campaignId = metaAssets.createPixelForCampaignId
            const refreshedPixels = await fetchMetaPixels(accountId)
            metaAssets.setMetaPixelsByAccount((prev) => ({
              ...prev,
              [accountId]: refreshedPixels,
            }))
            if (pixel.id && campaignId) {
              const ac = metaAssets.adCampaignsRef.current.find((c) => c.id === campaignId)
              const nextMetadata = {
                ...((ac?.metadata as Record<string, unknown> | undefined) ?? {}),
                meta_pixel_id: pixel.id,
              }
              metaAssets.setAdCampaigns((prev) =>
                prev.map((c) => (c.id === campaignId ? { ...c, metadata: nextMetadata } : c)),
              )
              await updateAdCampaign(campaignId, { metadata: nextMetadata })
            }
          }}
        />
      )}
    </div>
  )
}
