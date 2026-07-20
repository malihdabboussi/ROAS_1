'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { toast } from 'sonner'
import { MissionDetailModal } from '@/components/missions/MissionDetailModalAdapter'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import {
  createMission,
  fetchDeliverablesForMissions,
  fetchMissions,
  type Mission,
  type MissionDeliverable,
} from '@/lib/missions'
import { ADS_RESEARCH_MESSAGES } from '../../config/ads-research-messages.config'
import {
  buildAdsResearchMissionPayload,
  type AdsResearchKickoffFields,
} from '../playbooks/ads-research'
import { AdsResearchRunCard } from './AdsResearchRunCard'
import { AdsResearchRunLauncher } from './AdsResearchRunLauncher'

export function AdsResearchRunsView({
  spaceId,
  campaignId,
}: {
  spaceId: string
  campaignId: string | null
}) {
  const [runs, setRuns] = useState<Mission[]>([])
  const [deliverables, setDeliverables] = useState<Record<string, MissionDeliverable[]>>({})
  const [selectedRun, setSelectedRun] = useState<Mission | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const loadRuns = useCallback(async () => {
    setLoading(true)
    try {
      const missions = await fetchMissions({
        space_id: spaceId,
        campaign_id: campaignId ?? undefined,
      })
      const researchRuns = missions.filter(
        (mission) => mission.input?.playbook_id === 'ads-research',
      )
      setRuns(researchRuns)
      setDeliverables(await fetchDeliverablesForMissions(researchRuns.map((mission) => mission.id)))
    } catch {
      toast.error(ADS_RESEARCH_MESSAGES.LOAD_FAILED)
    } finally {
      setLoading(false)
    }
  }, [campaignId, spaceId])

  useEffect(() => {
    void loadRuns()
  }, [loadRuns])

  const startResearch = async (fields: AdsResearchKickoffFields) => {
    if (!campaignId || submitting) {
      if (!campaignId) toast.error(ADS_RESEARCH_MESSAGES.NO_CAMPAIGN)
      return
    }
    setSubmitting(true)
    try {
      const payload = buildAdsResearchMissionPayload(fields)
      const mission = await createMission({
        ...payload,
        campaign_id: campaignId,
        space_id: spaceId,
        idempotency_key: `playbook-ads-research-${crypto.randomUUID()}`,
      })
      await loadRuns()
      setSelectedRun(mission)
      toast.success(ADS_RESEARCH_MESSAGES.STARTED)
    } catch {
      toast.error(ADS_RESEARCH_MESSAGES.START_FAILED)
    } finally {
      setSubmitting(false)
    }
  }

  const runCountLabel = useMemo(
    () => `${runs.length} research ${runs.length === 1 ? 'run' : 'runs'}`,
    [runs.length],
  )

  return (
    <div className="p-spacing-4 gap-spacing-4 flex min-h-0 flex-1 flex-col overflow-y-auto">
      <AdsResearchRunLauncher
        disabled={!campaignId}
        submitting={submitting}
        onSubmit={(fields) => void startResearch(fields)}
      />

      <section className="gap-spacing-3 flex flex-col">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="body-2 text-foreground font-semibold">Research runs</h2>
            <p className="body-4 text-muted-foreground">{runCountLabel}</p>
          </div>
        </div>
        {loading ? (
          <div className="py-spacing-8 flex justify-center">
            <VibeyLoadingOrb text="Loading research runs…" state="processing" size="md" />
          </div>
        ) : runs.length === 0 ? (
          <div className="surface-card border-border p-spacing-6 rounded-spacing-3 flex flex-col items-center border text-center">
            <Search className="icon-lg text-muted-foreground" />
            <p className="body-2 text-foreground mt-spacing-3 font-semibold">
              {ADS_RESEARCH_MESSAGES.EMPTY_TITLE}
            </p>
            <p className="body-3 text-muted-foreground mt-spacing-1 max-w-xl">
              {ADS_RESEARCH_MESSAGES.EMPTY_DESCRIPTION}
            </p>
          </div>
        ) : (
          <div className="gap-spacing-3 grid lg:grid-cols-2">
            {runs.map((run) => (
              <AdsResearchRunCard
                key={run.id}
                run={run}
                deliverables={deliverables[run.id] ?? []}
                onOpen={() => setSelectedRun(run)}
              />
            ))}
          </div>
        )}
      </section>

      {selectedRun ? (
        <MissionDetailModal
          mission={selectedRun}
          onClose={() => setSelectedRun(null)}
          onUpdated={() => void loadRuns()}
        />
      ) : null}
    </div>
  )
}
