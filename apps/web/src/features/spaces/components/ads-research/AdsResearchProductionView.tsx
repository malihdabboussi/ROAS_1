'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, Circle, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { renderDeliverableEntityPreview } from '@/components/deliverables/deliverable-entity-preview-renderer'
import { DeliverablePreviewModal } from '@/components/deliverables/DeliverablePreviewModal'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import {
  fetchDeliverablesForMissions,
  fetchMissions,
  type Mission,
  type MissionDeliverable,
} from '@/lib/missions'
import { ADS_RESEARCH_MESSAGES } from '../../config/ads-research-messages.config'
import { AdsResearchProductionPath } from './AdsResearchProductionPath'
import { IgOrganicVideoProductionLauncher } from './IgOrganicVideoProductionLauncher'
import { StaticAdProductionLauncher } from './StaticAdProductionLauncher'

interface AdsResearchProductionViewProps {
  spaceId: string
  campaignId: string
  sourceMissionId?: string
}

function newestFirst(a: Mission, b: Mission): number {
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
}

export function AdsResearchProductionView({
  spaceId,
  campaignId,
  sourceMissionId,
}: AdsResearchProductionViewProps) {
  const [runs, setRuns] = useState<Mission[]>([])
  const [deliverables, setDeliverables] = useState<Record<string, MissionDeliverable[]>>({})
  const [selectedRunId, setSelectedRunId] = useState<string | null>(sourceMissionId ?? null)
  const [preview, setPreview] = useState<MissionDeliverable | null>(null)
  const [productionType, setProductionType] = useState<'static' | 'video'>('static')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    void fetchMissions({ space_id: spaceId, campaign_id: campaignId })
      .then(async (missions) => {
        const researchRuns = missions
          .filter((mission) => mission.input?.playbook_id === 'ads-research')
          .sort(newestFirst)
        const byMission = await fetchDeliverablesForMissions(
          researchRuns.map((mission) => mission.id),
        )
        if (!active) return
        setRuns(researchRuns)
        setDeliverables(byMission)
        setSelectedRunId((current) => {
          if (current && researchRuns.some((run) => run.id === current)) return current
          return researchRuns[0]?.id ?? null
        })
      })
      .catch(() => {
        if (active) toast.error(ADS_RESEARCH_MESSAGES.PRODUCTION_LOAD_FAILED)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [campaignId, spaceId])

  const selectedRun = useMemo(
    () => runs.find((run) => run.id === selectedRunId) ?? null,
    [runs, selectedRunId],
  )

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <VibeyLoadingOrb text="Loading production…" state="processing" size="lg" />
      </div>
    )
  }

  if (!selectedRun) {
    return (
      <div className="p-spacing-4 gap-spacing-5 flex min-h-0 flex-1 flex-col overflow-y-auto">
        <header>
          <p className="typo-section-label text-muted-foreground">PAID ADS WORKFLOW</p>
          <h1 className="title-h5 text-foreground mt-spacing-1 uppercase">PRODUCTION</h1>
          <p className="body-3 text-muted-foreground mt-spacing-1">
            Create video ads directly, or complete Ads Research to produce from recommendations.
          </p>
        </header>
        <div className="gap-spacing-2 flex">
          <button
            type="button"
            className={
              productionType === 'static' ? 'button-glass-primary' : 'button-glass-neutral'
            }
            onClick={() => setProductionType('static')}
          >
            Static ads
          </button>
          <button
            type="button"
            className={productionType === 'video' ? 'button-glass-primary' : 'button-glass-neutral'}
            onClick={() => setProductionType('video')}
          >
            Video ads
          </button>
        </div>
        {productionType === 'static' ? (
          <StaticAdProductionLauncher campaignId={campaignId} spaceId={spaceId} />
        ) : (
          <IgOrganicVideoProductionLauncher campaignId={campaignId} spaceId={spaceId} />
        )}
        <div className="surface-card border-border p-spacing-8 rounded-spacing-3 flex flex-col items-center justify-center border text-center">
          <Sparkles className="icon-lg text-muted-foreground" />
          <h2 className="title-h5 text-foreground mt-spacing-3 uppercase">
            NO RESEARCH HANDOFF YET
          </h2>
          <p className="body-3 text-muted-foreground mt-spacing-1 max-w-xl">
            Complete an Ads Research run to add its recommended concepts and copy to this production
            workspace.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-spacing-4 gap-spacing-5 flex min-h-0 flex-1 flex-col overflow-y-auto">
      <header>
        <p className="typo-section-label text-muted-foreground">PAID ADS WORKFLOW</p>
        <h1 className="title-h5 text-foreground mt-spacing-1 uppercase">PRODUCTION</h1>
        <p className="body-3 text-muted-foreground mt-spacing-1">
          Choose the concepts to make, approve the route, and track each handoff before launch.
        </p>
      </header>

      {runs.length > 1 ? (
        <div className="gap-spacing-2 flex flex-wrap">
          {runs.map((run) => {
            const selected = run.id === selectedRun.id
            return (
              <button
                key={run.id}
                type="button"
                className="button-glass-neutral button-compact gap-spacing-2 inline-flex items-center"
                aria-pressed={selected}
                onClick={() => setSelectedRunId(run.id)}
              >
                {selected ? (
                  <Check className="icon-sm text-primary" />
                ) : (
                  <Circle className="icon-sm text-muted-foreground" />
                )}
                {run.brief || run.title}
              </button>
            )
          })}
        </div>
      ) : null}

      <div className="gap-spacing-2 flex">
        <button
          type="button"
          className={productionType === 'static' ? 'button-glass-primary' : 'button-glass-neutral'}
          onClick={() => setProductionType('static')}
        >
          Static ads
        </button>
        <button
          type="button"
          className={productionType === 'video' ? 'button-glass-primary' : 'button-glass-neutral'}
          onClick={() => setProductionType('video')}
        >
          Video ads
        </button>
      </div>

      {productionType === 'static' ? (
        <StaticAdProductionLauncher
          campaignId={campaignId}
          spaceId={spaceId}
          sourceMissionId={selectedRun.id}
          sourceDeliverables={deliverables[selectedRun.id] ?? []}
        />
      ) : (
        <IgOrganicVideoProductionLauncher
          campaignId={campaignId}
          spaceId={spaceId}
          sourceMissionId={selectedRun.id}
          sourceDeliverables={deliverables[selectedRun.id] ?? []}
        />
      )}

      <AdsResearchProductionPath
        run={selectedRun}
        deliverables={deliverables[selectedRun.id] ?? []}
        spaceId={spaceId}
        onOpenRecommendations={setPreview}
      />

      {preview ? (
        <DeliverablePreviewModal
          deliverable={preview}
          agents={[]}
          campaignId={selectedRun.campaign_id}
          fallbackSpaceId={spaceId}
          hideOpenSourceMission
          renderEntityPreview={renderDeliverableEntityPreview}
          onClose={() => setPreview(null)}
          onBack={() => setPreview(null)}
          backLabel="Back to production"
        />
      ) : null}
    </div>
  )
}
