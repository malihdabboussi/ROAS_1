'use client'

import { AnimatePresence, motion } from 'framer-motion'
import type { AdCampaign, Funnel } from '@/lib/artifacts/artifact-types'
import type { CustomDomain } from '@/lib/domains/domains.types'
import { FunnelConversionSequenceSection } from './FunnelConversionSequenceSection'
import { FunnelConversionTagsDropdownSection } from './FunnelConversionTagsDropdownSection'
import { FunnelCustomDomainSection } from './FunnelCustomDomainSection'
import { FunnelHideBrandingSection } from './FunnelHideBrandingSection'
import { FunnelMetaPixelToggleSection } from './FunnelMetaPixelToggleSection'
import { FunnelMetaEventsPerPageSection } from './FunnelMetaEventsPerPageSection'
import { FunnelMetaEventsToggleRow } from './FunnelMetaEventsToggleRow'
import { FunnelMetaPixelSection } from './FunnelMetaPixelSection'
import { useFunnelSettings } from './use-funnel-settings'

export type FunnelSettingsSectionsProps = {
  campaignId: string
  funnel: Funnel
  onFunnelChange: (next: Funnel) => void
  isFreeUser: boolean
  domains?: CustomDomain[]
  setDomains?: React.Dispatch<React.SetStateAction<CustomDomain[]>>
  domainsLoading?: boolean
  metaPixelsByAccount?: Record<string, Array<{ id: string; name: string }>>
  adCampaigns?: AdCampaign[]
  onOpenDomainsWorkspace: () => void
  onOpenAddDomain: () => void
  selectedDomainId?: string
  setSelectedDomainId?: React.Dispatch<React.SetStateAction<string>>
}

export function FunnelSettingsSections({
  campaignId,
  funnel,
  onFunnelChange,
  isFreeUser,
  domains: domainsProp,
  setDomains,
  domainsLoading: domainsLoadingProp,
  metaPixelsByAccount,
  adCampaigns,
  onOpenDomainsWorkspace,
  onOpenAddDomain,
  selectedDomainId: funnelSelectedDomainId,
  setSelectedDomainId: setFunnelSelectedDomainId,
}: FunnelSettingsSectionsProps) {
  const settings = useFunnelSettings({
    campaignId,
    funnel,
    onFunnelChange,
    isFreeUser,
    domains: domainsProp,
    setDomains,
    domainsLoading: domainsLoadingProp,
    metaPixelsByAccount,
    adCampaigns,
    selectedDomainId: funnelSelectedDomainId,
    setSelectedDomainId: setFunnelSelectedDomainId,
  })

  const isSaving = settings.savingFunnelIds.has(settings.funnel.id)

  return (
    <>
      <div className="space-y-3 px-4 py-3">
        <FunnelHideBrandingSection
          funnel={settings.funnel}
          isFreeUser={settings.isFreeUser}
          onToggle={settings.handleToggleFunnelBranding}
        />
        <FunnelMetaPixelToggleSection
          funnel={settings.funnel}
          enabled={settings.metaPixelEnabled}
          onToggle={(id, enabled) =>
            void settings.handleToggleMetaPixelEnabled(id, enabled)
          }
        />
      </div>
      <div className="space-y-2.5 border-t border-[var(--border)] px-4 py-3">
        <FunnelConversionTagsDropdownSection
          funnel={settings.funnel}
          isSaving={isSaving}
          onToggleFunnelTag={settings.handleToggleFunnelTag}
        />
        <FunnelCustomDomainSection
          funnel={settings.funnel}
          domains={settings.domains}
          domainsLoading={settings.domainsLoading}
          selectedDomainId={settings.selectedDomainId}
          setSelectedDomainId={settings.setSelectedDomainId}
          domainActionLoading={settings.domainActionLoading}
          onConnect={(domainId) => void settings.handleConnectFunnelDomain(domainId)}
          onDisconnect={() => void settings.handleDisconnectFunnelDomain()}
          onOpenDomainsWorkspace={onOpenDomainsWorkspace}
          onOpenAddDomain={onOpenAddDomain}
        />
        <FunnelConversionSequenceSection
          funnel={settings.funnel}
          sequences={settings.sequences}
          funnelSequenceEdges={settings.funnelSequenceEdges}
          sequenceEdgeLoading={settings.sequenceEdgeLoading}
          sequenceEdgeSaving={settings.sequenceEdgeSaving}
          onConnect={settings.handleConnectFunnelSequence}
          onDisconnect={settings.handleDisconnectFunnelSequence}
        />
        {settings.metaPixelEnabled ? (
          <>
            <FunnelMetaPixelSection
              funnel={settings.funnel}
              allMetaPixelOptions={settings.allMetaPixelOptions}
              funnelPixelSaving={settings.funnelPixelSaving}
              funnelManualPixelId={settings.funnelManualPixelId}
              setFunnelManualPixelId={settings.setFunnelManualPixelId}
              onUpdatePixels={(id, pixels) => void settings.handleUpdateFunnelPixels(id, pixels)}
            />
            <FunnelMetaEventsToggleRow
              funnel={settings.funnel}
              enabled={settings.metaEventsEnabled}
              onToggle={(id, enabled) =>
                void settings.handleToggleMetaEventsEnabled(id, enabled)
              }
            />
            <AnimatePresence initial={false}>
              {settings.metaEventsEnabled ? (
                <motion.div
                  key="funnel-meta-events-per-page"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  style={{ overflow: 'hidden' }}
                >
                  <div className="pt-2.5">
                    <FunnelMetaEventsPerPageSection
                      funnel={settings.funnel}
                      onUpdateMetaEvents={(id, events) =>
                        void settings.handleUpdateFunnelMetaEvents(id, events)
                      }
                    />
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </>
        ) : null}
      </div>
    </>
  )
}
