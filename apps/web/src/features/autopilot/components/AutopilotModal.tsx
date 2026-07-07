'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeft, Clock3, X, Zap } from 'lucide-react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { AwarenessToggle } from '@/features/mission-control/components/AwarenessToggle'
import { fetchAwarenessPoints } from '@/features/mission-control/services/missions.service'
import { useMissionDashboardStore } from '@/features/mission-control/store/use-mission-dashboard-store'
import type { AwarenessPoint } from '@/features/mission-control/types'
import { fetchCampaigns } from '@/features/studio/services/campaign.service'
import type { Campaign } from '@/features/studio/types'
import { mergeCampaignContext } from '../lib/rpso-coverage'
import { AwarenessActivityColumn } from './AwarenessActivityColumn'
import { CampaignStrategyTree, type StrategyCampaignRow } from './CampaignStrategyTree'
import { StrategyEditor } from './StrategyEditor'

function isStrategyCampaign(c: Campaign): boolean {
  const cfg = c.config as Record<string, unknown> | undefined
  return cfg?.system_kind !== 'general'
}

export function AutopilotModal() {
  const agents = useMissionDashboardStore((s) => s.agents)
  const [open, setOpen] = useState(false)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [awareness, setAwareness] = useState<AwarenessPoint[]>([])
  const [awarenessLoading, setAwarenessLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const [mobileScreen, setMobileScreen] = useState<'tree' | 'strategy' | 'awareness'>('tree')

  const loadCampaigns = useCallback(async () => {
    setLoading(true)
    try {
      const list = await fetchCampaigns()
      setCampaigns(list)
      const stratIds = list.filter(isStrategyCampaign).map((c) => c.id)
      setSelectedId((prev) => {
        if (prev && stratIds.includes(prev)) return prev
        return stratIds[0] ?? null
      })
    } finally {
      setLoading(false)
    }
  }, [])

  const loadAwareness = useCallback(async () => {
    setAwarenessLoading(true)
    try {
      const pts = await fetchAwarenessPoints().catch(() => [])
      setAwareness(pts)
    } finally {
      setAwarenessLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    void loadCampaigns()
    void loadAwareness()
    setMobileScreen('tree')
  }, [open, loadCampaigns, loadAwareness])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const apply = () => setIsMobile(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const strategyRows: StrategyCampaignRow[] = useMemo(() => {
    return campaigns.filter(isStrategyCampaign).map((c) => ({
      id: c.id,
      name: c.name,
      icon: ((c.config as Record<string, unknown>)?.icon as string) ?? 'folder-kanban',
      context: mergeCampaignContext((c as Campaign & { context?: unknown }).context),
    }))
  }, [campaigns])

  const selectedRow = strategyRows.find((r) => r.id === selectedId)

  const handleTreeSelect = useCallback(
    (id: string) => {
      setSelectedId(id)
      if (isMobile) setMobileScreen('strategy')
    },
    [isMobile],
  )

  const portalTarget = typeof document !== 'undefined' ? document.body : null

  const trigger = (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="chip-glass-neutral body-3 text-foreground hover:bg-hover-subtle rounded-spacing-2 px-spacing-3 py-spacing-2 flex items-center gap-2 font-medium"
    >
      <Zap className="icon-sm shrink-0" />
      <span className="whitespace-nowrap">AutoPilot</span>
    </button>
  )

  if (!open) {
    return trigger
  }

  if (!portalTarget) {
    return trigger
  }

  const headerBase = (
    <div className="pb-spacing-4 flex shrink-0 items-center justify-between gap-3">
      <h2 className="title-h6 text-foreground uppercase">Autopilot</h2>
      <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
        <AwarenessToggle />
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="btn-icon-bare shrink-0"
          aria-label="Close"
        >
          <X className="icon-md" />
        </button>
      </div>
    </div>
  )

  const desktopTree = (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-modal-overlay" onClick={() => setOpen(false)} />
      <div className="surface-card border-border container-modal-3xl rounded-spacing-4 pt-spacing-4 pb-spacing-6 pl-spacing-6 pr-spacing-6 relative z-10 mx-4 flex max-h-[min(900px,90vh)] w-full flex-col overflow-hidden border shadow-xl">
        {headerBase}
        <div className="flex min-h-0 flex-1">
          <div className="pr-spacing-2 flex min-w-0 flex-[7] overflow-hidden">
            {loading ? (
              <div className="flex min-h-[320px] flex-1 items-center justify-center">
                <VibeyLoadingOrb text="Loading campaigns…" state="processing" size="lg" />
              </div>
            ) : (
              <div className="gap-spacing-2 flex min-h-0 min-w-0 flex-1">
                <CampaignStrategyTree
                  campaigns={strategyRows}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  variant="narrow"
                />
                {selectedRow ? (
                  <StrategyEditor
                    key={selectedRow.id}
                    campaignId={selectedRow.id}
                    name={selectedRow.name}
                    initialContext={selectedRow.context}
                    onSaved={() => void loadCampaigns()}
                  />
                ) : (
                  <div className="body-3 text-muted-foreground p-spacing-6 flex flex-1 items-center justify-center">
                    Select a campaign to view strategy.
                  </div>
                )}
              </div>
            )}
          </div>
          <AwarenessActivityColumn
            points={awareness}
            loading={awarenessLoading}
            layout="sidebar"
            agents={agents}
          />
        </div>
      </div>
    </div>
  )

  const mobileTree = (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--color-background)] md:hidden">
      {mobileScreen === 'tree' && (
        <>
          <div className="border-b-glass flex items-center justify-between px-3 py-3">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="chip-glass-neutral h-spacing-8 w-spacing-8 flex items-center justify-center rounded-lg"
              aria-label="Close"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <span className="title-h6 text-foreground flex-1 text-center uppercase">Autopilot</span>
            <div className="w-spacing-8 shrink-0" />
          </div>
          <div className="border-border flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2">
            <AwarenessToggle />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
            {loading ? (
              <div className="flex min-h-[40vh] items-center justify-center">
                <VibeyLoadingOrb text="Loading campaigns…" state="processing" size="lg" />
              </div>
            ) : (
              <CampaignStrategyTree
                campaigns={strategyRows}
                selectedId={selectedId}
                onSelect={handleTreeSelect}
                variant="fluid"
              />
            )}
          </div>
        </>
      )}
      {mobileScreen === 'strategy' && (
        <>
          <div className="border-b-glass flex items-center justify-between px-3 py-3">
            <button
              type="button"
              onClick={() => setMobileScreen('tree')}
              className="chip-glass-neutral h-spacing-8 w-spacing-8 flex items-center justify-center rounded-lg"
              aria-label="Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <span className="body-2 min-w-0 flex-1 truncate px-2 text-center font-medium text-[var(--color-foreground)]">
              {selectedRow?.name ?? 'Strategy'}
            </span>
            <button
              type="button"
              onClick={() => setMobileScreen('awareness')}
              className="chip-glass-neutral h-spacing-8 w-spacing-8 flex items-center justify-center rounded-lg"
              aria-label="Awareness"
            >
              <Clock3 className="h-4 w-4" />
            </button>
          </div>
          <div className="border-border flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2">
            <AwarenessToggle />
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            {selectedRow ? (
              <StrategyEditor
                key={selectedRow.id}
                campaignId={selectedRow.id}
                name={selectedRow.name}
                initialContext={selectedRow.context}
                onSaved={() => void loadCampaigns()}
              />
            ) : (
              <div className="body-3 text-muted-foreground p-spacing-6 flex flex-1 items-center justify-center">
                Select a campaign from the list.
              </div>
            )}
          </div>
        </>
      )}
      {mobileScreen === 'awareness' && (
        <>
          <div className="border-b-glass flex items-center px-3 py-3">
            <button
              type="button"
              onClick={() => setMobileScreen('strategy')}
              className="chip-glass-neutral h-spacing-8 w-spacing-8 flex items-center justify-center rounded-lg"
              aria-label="Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <span className="body-2 min-w-0 flex-1 truncate px-2 text-center font-medium text-[var(--color-foreground)]">
              Awareness
            </span>
            <div className="w-spacing-8 shrink-0" />
          </div>
          <AwarenessActivityColumn
            points={awareness}
            loading={awarenessLoading}
            layout="full"
            className="min-h-0 flex-1"
            agents={agents}
          />
        </>
      )}
    </div>
  )

  return (
    <>
      {trigger}
      {createPortal(isMobile ? mobileTree : desktopTree, portalTarget)}
    </>
  )
}
