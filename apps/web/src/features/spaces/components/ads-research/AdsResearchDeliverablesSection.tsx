import { ArrowRight, Sparkles } from 'lucide-react'
import type { MissionDeliverable } from '@/lib/missions'
import type { SavedAdSearch } from '../../services/ads-research.service'

function deliverableLabel(title: string): string {
  return title.replace(/^Task \d+\s*[—-]\s*/, '').replace(/^ADS-R#\d+\s*[—-]\s*/, '')
}

function deliverableOrder(title: string): number {
  const match = title.match(/ADS-R#(\d+)/)
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER
}

function findDeliverable(
  deliverables: MissionDeliverable[],
  pattern: RegExp,
): MissionDeliverable | undefined {
  return deliverables.find((deliverable) => pattern.test(deliverable.title))
}

function DeliverableLink({
  deliverable,
  onOpen,
}: {
  deliverable: MissionDeliverable
  onOpen: (deliverable: MissionDeliverable) => void
}) {
  return (
    <button
      type="button"
      className="text-primary inline font-semibold underline-offset-2 hover:underline"
      onClick={() => onOpen(deliverable)}
    >
      {deliverableLabel(deliverable.title)}
    </button>
  )
}

export function AdsResearchDeliverablesSection({
  deliverables,
  searches,
  onOpen,
  onStartProduction,
}: {
  deliverables: MissionDeliverable[]
  searches: SavedAdSearch[]
  onOpen: (deliverable: MissionDeliverable) => void
  onStartProduction?: () => void
}) {
  const ordered = [...deliverables].sort(
    (a, b) => deliverableOrder(a.title) - deliverableOrder(b.title),
  )
  const currentAds = findDeliverable(ordered, /ADS-R#1|Current Ads Analysis/i)
  const marketResearch = findDeliverable(ordered, /ADS-R#2|Market and Competitive Research/i)
  const recommendations = findDeliverable(ordered, /ADS-R#3|Recommended Ads and Draft Copy/i)
  const scripts = findDeliverable(ordered, /ADS-R#4|Video Ad Scripts/i)
  const totalAds = searches.reduce((total, search) => total + search.results.length, 0)
  const platformCount = new Set(searches.map((search) => search.platform)).size

  return (
    <section className="gap-spacing-3 flex flex-col">
      <div>
        <p className="typo-section-label text-muted-foreground">RESEARCH SUMMARY</p>
        <h2 className="title-h6 text-foreground mt-spacing-1">
          WHAT BLAZE DID AND WHAT COMES NEXT
        </h2>
      </div>

      <div className="surface-card border-border p-spacing-5 gap-spacing-5 rounded-spacing-3 flex flex-wrap items-center border">
        <p className="body-2 text-foreground min-w-0 flex-1 leading-relaxed">
          Blaze reviewed{' '}
          <a
            href="#visual-research"
            className="text-primary font-semibold underline-offset-2 hover:underline"
          >
            {totalAds} visual ads across {searches.length} research
            {searches.length === 1 ? ' angle' : ' angles'}
          </a>{' '}
          and {platformCount} traffic {platformCount === 1 ? 'source' : 'sources'}.
          {currentAds ? (
            <>
              {' '}
              The live performance findings are in{' '}
              <DeliverableLink deliverable={currentAds} onOpen={onOpen} />.
            </>
          ) : null}
          {marketResearch ? (
            <>
              {' '}
              The market patterns and competitive gaps are in{' '}
              <DeliverableLink deliverable={marketResearch} onOpen={onOpen} />.
            </>
          ) : null}
          {recommendations ? (
            <>
              {' '}
              Blaze turned that evidence into{' '}
              <DeliverableLink deliverable={recommendations} onOpen={onOpen} />.
            </>
          ) : null}
          {scripts ? (
            <>
              {' '}
              Ready-to-produce scripts are in{' '}
              <DeliverableLink deliverable={scripts} onOpen={onOpen} />.
            </>
          ) : null}{' '}
          Next, choose which concepts move into recording or design.
        </p>
        {onStartProduction ? (
          <button
            type="button"
            className="gap-spacing-3 flex shrink-0 items-center"
            onClick={onStartProduction}
            aria-label="Start production"
          >
            <span className="btn-icon-glass">
              <Sparkles className="icon-sm text-primary" />
            </span>
            <span className="body-2 text-foreground font-semibold">Start production</span>
            <ArrowRight className="icon-sm text-muted-foreground" />
          </button>
        ) : null}
        {ordered.length === 0 ? (
          <span className="body-4 text-muted-foreground">
            Blaze has not attached the written outputs yet.
          </span>
        ) : null}
      </div>
    </section>
  )
}
