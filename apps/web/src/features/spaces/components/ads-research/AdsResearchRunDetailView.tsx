'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ListChecks, Megaphone } from 'lucide-react'
import { renderDeliverableEntityPreview } from '@/components/deliverables/deliverable-entity-preview-renderer'
import { DeliverablePreviewModal } from '@/components/deliverables/DeliverablePreviewModal'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import type { Mission, MissionDeliverable } from '@/lib/missions'
import { ADS_RESEARCH_MESSAGES } from '../../config/ads-research-messages.config'
import {
  getSavedAdSearch,
  listSavedAdSearches,
  type SavedAdSearch,
  type SavedAdSearchSummary,
} from '../../services/ads-research.service'
import { AdsResearchAngleSection } from './AdsResearchAngleSection'
import { AdsResearchDeliverablesSection } from './AdsResearchDeliverablesSection'
import { AdsResearchProductionPath } from './AdsResearchProductionPath'

interface AdsResearchRunDetailViewProps {
  run: Mission
  deliverables: MissionDeliverable[]
  spaceId: string
  onBack: () => void
  onOpenMission: () => void
}

function searchesForRun(searches: SavedAdSearchSummary[], run: Mission): SavedAdSearchSummary[] {
  const linked = searches.filter((search) => search.mission_ids?.includes(run.id))
  if (linked.length > 0) return linked

  const startedAt = new Date(run.started_at ?? run.created_at).getTime()
  const endedAt = new Date(run.completed_at ?? run.updated_at).getTime() + 10 * 60 * 1000
  return searches.filter((search) => {
    const createdAt = new Date(search.created_at).getTime()
    return createdAt >= startedAt && createdAt <= endedAt
  })
}

export function AdsResearchRunDetailView({
  run,
  deliverables,
  spaceId,
  onBack,
  onOpenMission,
}: AdsResearchRunDetailViewProps) {
  const [searches, setSearches] = useState<SavedAdSearch[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [expandedSearchId, setExpandedSearchId] = useState<string | null>(null)
  const [previewDeliverable, setPreviewDeliverable] = useState<MissionDeliverable | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setLoadError(null)
    void listSavedAdSearches(spaceId)
      .then((summaries) =>
        Promise.all(
          searchesForRun(summaries, run).map((search) => getSavedAdSearch(spaceId, search.id)),
        ),
      )
      .then((loaded) => {
        if (active) {
          setSearches(loaded)
          setExpandedSearchId((current) =>
            current && loaded.some((search) => search.id === current)
              ? current
              : (loaded[0]?.id ?? null),
          )
        }
      })
      .catch(() => {
        if (active) setLoadError(ADS_RESEARCH_MESSAGES.VISUAL_LOAD_FAILED)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [run, spaceId])

  const totalAds = useMemo(
    () => searches.reduce((total, search) => total + search.results.length, 0),
    [searches],
  )

  return (
    <div className="p-spacing-4 gap-spacing-6 flex min-h-0 flex-1 flex-col overflow-y-auto">
      <header className="gap-spacing-4 flex flex-wrap items-start justify-between">
        <div className="gap-spacing-3 flex min-w-0 items-start">
          <button
            type="button"
            className="btn-icon-glass shrink-0"
            onClick={onBack}
            aria-label="Back to research runs"
          >
            <ArrowLeft className="icon-sm" />
          </button>
          <div className="min-w-0">
            <p className="body-4 text-muted-foreground">ADS RESEARCH REPORT</p>
            <h1 className="title-h5 text-foreground truncate uppercase">
              {run.brief || run.title}
            </h1>
            <p className="body-3 text-muted-foreground mt-spacing-1">Blaze research report</p>
          </div>
        </div>
        <div className="gap-spacing-2 flex items-center">
          <button
            type="button"
            className="button-glass-neutral button-compact gap-spacing-2 inline-flex items-center"
            onClick={onOpenMission}
          >
            <ListChecks className="icon-sm" />
            Mission Details
          </button>
        </div>
      </header>

      <div className="surface-card border-border rounded-spacing-3 grid border sm:grid-cols-3">
        <div className="p-spacing-4 border-border border-b sm:border-b-0 sm:border-r">
          <p className="title-h6 text-foreground">
            {searches.length} {searches.length === 1 ? 'angle' : 'angles'}
          </p>
          <p className="body-4 text-muted-foreground">Research directions</p>
        </div>
        <div className="p-spacing-4 border-border border-b sm:border-b-0 sm:border-r">
          <p className="title-h6 text-foreground">{totalAds} visual ads</p>
          <p className="body-4 text-muted-foreground">Saved evidence</p>
        </div>
        <div className="p-spacing-4">
          <p className="title-h6 text-foreground">{deliverables.length} outputs</p>
          <p className="body-4 text-muted-foreground">Analysis and production</p>
        </div>
      </div>

      <AdsResearchDeliverablesSection
        deliverables={deliverables}
        searches={searches}
        onOpen={setPreviewDeliverable}
      />

      <AdsResearchProductionPath
        run={run}
        deliverables={deliverables}
        spaceId={spaceId}
        onOpenRecommendations={setPreviewDeliverable}
      />

      <section id="visual-research" className="gap-spacing-3 flex flex-col">
        <div>
          <h2 className="title-h6 text-foreground">VISUAL RESEARCH</h2>
          <p className="body-3 text-muted-foreground">
            Review one angle at a time. Each row previews the ads Blaze used as evidence.
          </p>
        </div>
        {loading ? (
          <div className="py-spacing-8 flex justify-center">
            <VibeyLoadingOrb text="Loading visual research…" state="processing" size="md" />
          </div>
        ) : loadError ? (
          <div className="surface-card border-border p-spacing-6 rounded-spacing-3 border text-center">
            <p className="body-3 text-destructive">{loadError}</p>
          </div>
        ) : searches.length === 0 ? (
          <div className="surface-card border-border p-spacing-6 rounded-spacing-3 flex flex-col items-center border text-center">
            <Megaphone className="icon-lg text-muted-foreground" />
            <p className="body-2 text-foreground mt-spacing-3 font-semibold">
              No visual sources were attached
            </p>
            <p className="body-3 text-muted-foreground mt-spacing-1 max-w-xl">
              This run produced documents but did not save ad-library snapshots with the mission.
            </p>
          </div>
        ) : (
          <div className="gap-spacing-3 flex flex-col">
            {searches.map((search, index) => (
              <AdsResearchAngleSection
                key={search.id}
                search={search}
                spaceId={spaceId}
                index={index}
                expanded={expandedSearchId === search.id}
                onToggle={() =>
                  setExpandedSearchId((current) => (current === search.id ? null : search.id))
                }
              />
            ))}
          </div>
        )}
      </section>

      {previewDeliverable ? (
        <DeliverablePreviewModal
          deliverable={previewDeliverable}
          agents={[]}
          campaignId={run.campaign_id}
          fallbackSpaceId={spaceId}
          hideOpenSourceMission
          renderEntityPreview={renderDeliverableEntityPreview}
          onClose={() => setPreviewDeliverable(null)}
          onBack={() => setPreviewDeliverable(null)}
          backLabel="Back to research"
        />
      ) : null}
    </div>
  )
}
