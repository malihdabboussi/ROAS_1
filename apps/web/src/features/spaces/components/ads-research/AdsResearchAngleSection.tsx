'use client'

import { useState } from 'react'
import { ChevronDown, Megaphone, Play } from 'lucide-react'
import { DEFAULT_ADS_RESEARCH_CONFIG } from '../../lib/ads-research-group-by'
import {
  updateSavedAdSearch,
  type AdSearchResultItem,
  type SavedAdSearch,
} from '../../services/ads-research.service'
import { AdAnalysisPanel } from './AdAnalysisPanel'
import { AdResultsBody } from './AdResultsBody'

const INITIAL_AD_LIMIT = 6

function AnglePreviewTile({ ad }: { ad: AdSearchResultItem }) {
  const [failed, setFailed] = useState(false)
  const showImage = Boolean(ad.image_url && !failed)

  return (
    <span className="border-border bg-secondary h-spacing-12 w-spacing-9 rounded-spacing-1 flex shrink-0 items-center justify-center overflow-hidden border">
      {showImage ? (
        <img
          src={ad.image_url ?? undefined}
          alt=""
          className="h-full w-full object-contain"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : ad.format === 'video' ? (
        <Play className="icon-sm text-muted-foreground" />
      ) : (
        <Megaphone className="icon-sm text-muted-foreground" />
      )}
    </span>
  )
}

export function normalizeAngleTitle(title: string): string {
  const normalized = title.replace(/^Angle\s+\d+\s*:\s*/i, '').trim()
  return normalized || title
}

export function AdsResearchAngleSection({
  search,
  spaceId,
  index,
  expanded,
  onToggle,
}: {
  search: SavedAdSearch
  spaceId: string
  index: number
  expanded: boolean
  onToggle: () => void
}) {
  const [showAll, setShowAll] = useState(false)
  const [results, setResults] = useState(search.results)
  const [selectedAd, setSelectedAd] = useState<AdSearchResultItem | null>(null)
  const visibleAds = showAll ? results : results.slice(0, INITIAL_AD_LIMIT)
  const angleTitle = normalizeAngleTitle(search.title)

  const persistAdPatch = async (adId: string, patch: Partial<AdSearchResultItem>) => {
    const updatedResults = results.map((ad) => (ad.ad_id === adId ? { ...ad, ...patch } : ad))
    setResults(updatedResults)
    setSelectedAd((current) => (current?.ad_id === adId ? { ...current, ...patch } : current))
    await updateSavedAdSearch(spaceId, search.id, { results: updatedResults })
  }

  return (
    <>
      <article className="surface-card border-border rounded-spacing-3 overflow-hidden border">
        <button
          type="button"
          className="hover:bg-hover-subtle p-spacing-4 gap-spacing-4 flex w-full items-center justify-between text-left transition-colors"
          aria-expanded={expanded}
          onClick={onToggle}
        >
          <div className="min-w-0 flex-1">
            <p className="typo-section-label text-muted-foreground">ANGLE {index + 1}</p>
            <h3 className="body-2 text-foreground mt-spacing-1 truncate font-semibold">
              {angleTitle}
            </h3>
            <p className="body-4 text-muted-foreground mt-spacing-1">
              {search.platform.toUpperCase()} · {results.length} visual ads
            </p>
          </div>
          <div className="gap-spacing-2 hidden shrink-0 items-center sm:flex">
            {results.slice(0, 3).map((ad) => (
              <AnglePreviewTile key={ad.ad_id} ad={ad} />
            ))}
            <ChevronDown
              className={`icon-sm text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`}
            />
          </div>
        </button>

        {expanded ? (
          <div className="border-border p-spacing-4 gap-spacing-4 flex flex-col border-t">
            <AdResultsBody
              ads={visibleAds}
              config={DEFAULT_ADS_RESEARCH_CONFIG}
              savedIds={new Set()}
              savingIds={new Set()}
              onAdClick={setSelectedAd}
            />
            {results.length > INITIAL_AD_LIMIT ? (
              <button
                type="button"
                className="button-glass-neutral button-compact self-start"
                onClick={() => setShowAll((current) => !current)}
              >
                {showAll ? 'Show fewer ads' : `View all ${results.length} ads in this angle`}
              </button>
            ) : null}
          </div>
        ) : null}
      </article>

      {selectedAd ? (
        <AdAnalysisPanel
          key={selectedAd.ad_id}
          ad={selectedAd}
          spaceId={spaceId}
          saved={false}
          saving={false}
          researchContext={{ angleTitle, query: search.query }}
          onAdPatch={(patch) => persistAdPatch(selectedAd.ad_id, patch)}
          onClose={() => setSelectedAd(null)}
        />
      ) : null}
    </>
  )
}
