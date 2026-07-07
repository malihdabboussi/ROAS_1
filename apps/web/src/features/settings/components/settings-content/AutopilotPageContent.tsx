'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { AwarenessActivityColumn } from '@/features/autopilot/components/AwarenessActivityColumn'
import {
  CampaignStrategyTree,
  type StrategyCampaignRow,
} from '@/features/autopilot/components/CampaignStrategyTree'
import { StrategyEditor } from '@/features/autopilot/components/StrategyEditor'
import { mergeCampaignContext } from '@/features/autopilot/lib/rpso-coverage'
import { AwarenessToggle } from '@/features/mission-control/components/AwarenessToggle'
import { fetchAwarenessPoints } from '@/features/mission-control/services/missions.service'
import { useMissionDashboardStore } from '@/features/mission-control/store/use-mission-dashboard-store'
import type { AwarenessPoint } from '@/features/mission-control/types'
import { fetchCampaigns } from '@/features/studio/services/campaign.service'
import type { Campaign } from '@/features/studio/types'

function isStrategyCampaign(c: Campaign): boolean {
  const cfg = c.config as Record<string, unknown> | undefined
  return cfg?.system_kind !== 'general'
}

export default function AutopilotPageContent() {
  const agents = useMissionDashboardStore((s) => s.agents)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [awareness, setAwareness] = useState<AwarenessPoint[]>([])
  const [awarenessLoading, setAwarenessLoading] = useState(true)

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
    void loadCampaigns()
    void loadAwareness()
  }, [loadCampaigns, loadAwareness])

  const strategyRows: StrategyCampaignRow[] = useMemo(() => {
    return campaigns.filter(isStrategyCampaign).map((c) => ({
      id: c.id,
      name: c.name,
      icon: ((c.config as Record<string, unknown>)?.icon as string) ?? 'folder-kanban',
      context: mergeCampaignContext((c as Campaign & { context?: unknown }).context),
    }))
  }, [campaigns])

  const selectedRow = strategyRows.find((r) => r.id === selectedId)

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="px-spacing-6 py-spacing-4 flex shrink-0 items-center justify-between border-b border-[var(--border)]">
        <h2 className="title-h6 text-foreground uppercase">Autopilot</h2>
        <AwarenessToggle />
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <VibeyLoadingOrb text="Loading campaigns..." state="processing" size="lg" />
          </div>
        ) : (
          <div className="flex min-h-0 min-w-0 flex-1 gap-2 p-4">
            <div className="flex min-w-0 flex-[7] overflow-hidden">
              <div className="flex min-h-0 min-w-0 flex-1 gap-2">
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
                  <div className="body-3 text-muted-foreground flex flex-1 items-center justify-center p-6">
                    Select a campaign to view strategy.
                  </div>
                )}
              </div>
            </div>
            <AwarenessActivityColumn
              points={awareness}
              loading={awarenessLoading}
              layout="sidebar"
              agents={agents}
            />
          </div>
        )}
      </div>
    </div>
  )
}
