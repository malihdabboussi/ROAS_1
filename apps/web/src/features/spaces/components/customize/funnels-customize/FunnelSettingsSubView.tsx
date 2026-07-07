'use client'

import { ArrowLeft, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AddCustomDomainDialog } from '@/components/domains/AddCustomDomainDialog'
import { CustomDomainDnsDialog } from '@/components/domains/CustomDomainDnsDialog'
import {
  FunnelConversionSequenceSection,
  FunnelConversionTagsDropdownSection,
  FunnelCustomDomainSection,
  FunnelHideBrandingSection,
  FunnelMetaEventsPerPageSection,
  FunnelMetaEventsToggleRow,
  FunnelMetaPixelSection,
  FunnelMetaPixelToggleSection,
  useFunnelSettings,
} from '@/components/funnels/funnel-settings'
import { billingApi } from '@/lib/billing/billing-api'
import type { Funnel } from '@/lib/artifacts/artifact-types'
import { fetchCampaignFunnels } from '@/lib/artifacts/funnel-preview-api'
import type { CustomDomain, DomainStatus } from '@/lib/domains/domains.types'
import { useWorkspaceSettingsModal } from '@/lib/settings/workspace-settings-modal-context'

function FunnelSettingsForm(props: {
  campaignId: string
  funnel: Funnel
  isFreeUser: boolean
  onFunnelChange: (next: Funnel) => void
  onOpenAddDomain: () => void
  addDomainOpen: boolean
  setAddDomainOpen: (v: boolean) => void
  dnsDialogDomain: CustomDomain | null
  setDnsDialogDomain: (v: CustomDomain | null) => void
}) {
  const {
    campaignId,
    funnel,
    isFreeUser,
    onFunnelChange,
    onOpenAddDomain,
    addDomainOpen,
    setAddDomainOpen,
    dnsDialogDomain,
    setDnsDialogDomain,
  } = props

  const { openWorkspaceSettings } = useWorkspaceSettingsModal()

  const settings = useFunnelSettings({
    campaignId,
    funnel,
    onFunnelChange,
    isFreeUser,
  })

  const handleDomainUpdated = useCallback(
    (update: {
      id: string
      status?: DomainStatus
      verification_records?: CustomDomain['verification_records']
    }) => {
      settings.setDomains((prev) =>
        prev.map((d) =>
          d.id === update.id
            ? {
                ...d,
                ...(update.status ? { status: update.status } : {}),
                ...(update.verification_records !== undefined
                  ? { verification_records: update.verification_records }
                  : {}),
                last_verification_check: new Date().toISOString(),
              }
            : d,
        ),
      )
    },
    [settings.setDomains],
  )

  const isSaving = settings.savingFunnelIds.has(funnel.id)

  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto">
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
            onOpenDomainsWorkspace={() => openWorkspaceSettings('domains')}
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
                onUpdatePixels={(id, pixels) =>
                  void settings.handleUpdateFunnelPixels(id, pixels)
                }
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
      </div>

      <AddCustomDomainDialog
        isOpen={addDomainOpen}
        onClose={() => setAddDomainOpen(false)}
        onDomainAdded={(domain) => {
          settings.setDomains((prev) => [domain, ...prev])
          settings.setSelectedDomainId(domain.id)
          setAddDomainOpen(false)
          setDnsDialogDomain(domain)
        }}
      />

      <CustomDomainDnsDialog
        domain={dnsDialogDomain}
        onClose={() => setDnsDialogDomain(null)}
        onDomainUpdated={handleDomainUpdated}
      />
    </>
  )
}

export function FunnelSettingsSubView(props: {
  campaignId: string
  funnelId: string
  onBack: () => void
  onClose: () => void
}) {
  const { campaignId, funnelId, onBack, onClose } = props
  const [funnel, setFunnel] = useState<Funnel | null>(null)
  const [loading, setLoading] = useState(true)
  const [isFreeUser, setIsFreeUser] = useState(true)
  const [addDomainOpen, setAddDomainOpen] = useState(false)
  const [dnsDialogDomain, setDnsDialogDomain] = useState<CustomDomain | null>(null)

  const reloadFunnel = useCallback(async () => {
    const list = await fetchCampaignFunnels(campaignId)
    const next = list.find((f) => f.id === funnelId) ?? null
    setFunnel(next)
  }, [campaignId, funnelId])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const status = await billingApi.getStatus().catch(() => null)
      if (!cancelled) {
        setIsFreeUser(!status?.plan || status.plan.slug === 'free')
      }
      try {
        await reloadFunnel()
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [reloadFunnel])

  const onFunnelChange = useCallback((next: Funnel) => {
    setFunnel(next)
  }, [])

  if (loading || !funnel) {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
          <button
            type="button"
            onClick={onBack}
            className="shrink-0 rounded-md p-1 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="body-3 truncate font-semibold text-[var(--foreground)]">
            Funnel settings
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="ml-auto shrink-0 rounded-md p-1 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="body-3 px-4 py-6 text-[var(--color-muted-foreground)]">
          {!loading ? 'Funnel not found.' : 'Loading…'}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          className="shrink-0 rounded-md p-1 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="body-3 min-w-0 flex-1 truncate font-semibold text-[var(--foreground)]">
          {funnel.name}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="shrink-0 rounded-md p-1 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <FunnelSettingsForm
        campaignId={campaignId}
        funnel={funnel}
        isFreeUser={isFreeUser}
        onFunnelChange={onFunnelChange}
        onOpenAddDomain={() => setAddDomainOpen(true)}
        addDomainOpen={addDomainOpen}
        setAddDomainOpen={setAddDomainOpen}
        dnsDialogDomain={dnsDialogDomain}
        setDnsDialogDomain={setDnsDialogDomain}
      />
    </div>
  )
}
