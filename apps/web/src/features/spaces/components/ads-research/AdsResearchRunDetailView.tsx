'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, FileText, ListChecks, Megaphone, RotateCcw } from 'lucide-react'
import { renderDeliverableEntityPreview } from '@/components/deliverables/deliverable-entity-preview-renderer'
import { DeliverablePreviewModal } from '@/components/deliverables/DeliverablePreviewModal'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import type { Mission, MissionDeliverable } from '@/lib/missions'
import { openInNewTab } from '@/lib/utils/open-in-new-tab'
import { ADS_RESEARCH_MESSAGES } from '../../config/ads-research-messages.config'
import { DEFAULT_ADS_RESEARCH_CONFIG } from '../../lib/ads-research-group-by'
import {
  getSavedAdSearch,
  listSavedAdSearches,
  type SavedAdSearch,
  type SavedAdSearchSummary,
} from '../../services/ads-research.service'
import { adResultExternalLink } from './AdResultCard'
import { AdResultsBody } from './AdResultsBody'

interface AdsResearchRunDetailViewProps {
  run: Mission
  deliverables: MissionDeliverable[]
  spaceId: string
  onBack: () => void
  onOpenMission: () => void
  onRerun: () => void
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

function deliverableLabel(title: string): string {
  return title.replace(/^Task \d+\s*[—-]\s*/, '').replace(/^ADS-R#\d+\s*[—-]\s*/, '')
}

export function AdsResearchRunDetailView({
  run,
  deliverables,
  spaceId,
  onBack,
  onOpenMission,
  onRerun,
}: AdsResearchRunDetailViewProps) {
  const [searches, setSearches] = useState<SavedAdSearch[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
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
        if (active) setSearches(loaded)
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
            <p className="body-3 text-muted-foreground mt-spacing-1">
              {totalAds} visual references across {searches.length} searches
            </p>
          </div>
        </div>
        <div className="gap-spacing-2 flex items-center">
          <button
            type="button"
            className="button-glass-primary button-compact gap-spacing-2 inline-flex items-center"
            onClick={onRerun}
          >
            <RotateCcw className="icon-sm" />
            {ADS_RESEARCH_MESSAGES.RERUN_BUTTON}
          </button>
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

      <section className="gap-spacing-3 flex flex-col">
        <div>
          <h2 className="title-h6 text-foreground">VISUAL RESEARCH</h2>
          <p className="body-3 text-muted-foreground">
            The actual ads Blaze used as research evidence.
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
          searches.map((search) => (
            <div
              key={search.id}
              className="surface-card border-border p-spacing-4 gap-spacing-3 rounded-spacing-3 flex flex-col border"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="body-2 text-foreground font-semibold">{search.title}</h3>
                  <p className="body-4 text-muted-foreground">
                    {search.platform.toUpperCase()} · {search.results.length} ads
                  </p>
                </div>
              </div>
              <AdResultsBody
                ads={search.results}
                config={DEFAULT_ADS_RESEARCH_CONFIG}
                savedIds={new Set()}
                savingIds={new Set()}
                onAdClick={(ad) => {
                  const target = adResultExternalLink(ad)
                  if (target) openInNewTab(target)
                }}
              />
            </div>
          ))
        )}
      </section>

      <section className="gap-spacing-3 flex flex-col">
        <div>
          <h2 className="title-h6 text-foreground">ANALYSIS AND RECOMMENDATIONS</h2>
          <p className="body-3 text-muted-foreground">
            Open the analysis, concepts, copy, and scripts created by Blaze.
          </p>
        </div>
        <div className="gap-spacing-3 grid md:grid-cols-2 xl:grid-cols-3">
          {deliverables.map((deliverable) => (
            <button
              key={deliverable.id}
              type="button"
              className="card-glass hover:bg-hover-subtle p-spacing-4 gap-spacing-3 rounded-spacing-3 flex min-h-28 flex-col border-0 text-left transition-colors"
              onClick={() => setPreviewDeliverable(deliverable)}
            >
              <FileText className="icon-sm text-muted-foreground" />
              <span className="body-2 text-foreground font-semibold">
                {deliverableLabel(deliverable.title)}
              </span>
              <span className="body-4 text-muted-foreground">Open document</span>
            </button>
          ))}
        </div>
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
