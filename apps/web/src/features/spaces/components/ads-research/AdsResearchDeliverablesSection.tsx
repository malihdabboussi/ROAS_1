import { ChevronDown, FileText, Search } from 'lucide-react'
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

function SummaryButton({
  title,
  description,
  onClick,
}: {
  title: string
  description: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className="surface-card border-border hover:bg-hover-subtle p-spacing-4 gap-spacing-2 rounded-spacing-3 flex flex-col border text-left transition-colors"
      onClick={onClick}
    >
      <span className="body-2 text-foreground font-semibold">{title}</span>
      <span className="body-4 text-muted-foreground">{description}</span>
    </button>
  )
}

export function AdsResearchDeliverablesSection({
  deliverables,
  searches,
  onOpen,
}: {
  deliverables: MissionDeliverable[]
  searches: SavedAdSearch[]
  onOpen: (deliverable: MissionDeliverable) => void
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
    <section className="gap-spacing-4 flex flex-col">
      <div>
        <p className="typo-section-label text-muted-foreground">RESEARCH SUMMARY</p>
        <h2 className="title-h6 text-foreground mt-spacing-1">
          WHAT BLAZE DID AND WHAT COMES NEXT
        </h2>
      </div>

      <div className="gap-spacing-3 grid md:grid-cols-2 xl:grid-cols-4">
        <a
          href="#visual-research"
          className="surface-card border-border hover:bg-hover-subtle p-spacing-4 gap-spacing-2 rounded-spacing-3 flex flex-col border transition-colors"
        >
          <span className="body-2 text-foreground font-semibold">We researched</span>
          <span className="body-4 text-muted-foreground">
            {totalAds} visual ads across {searches.length} angles and {platformCount} traffic
            {platformCount === 1 ? ' source' : ' sources'}.
          </span>
        </a>
        {marketResearch || currentAds ? (
          <SummaryButton
            title="What Blaze found"
            description="The performance signals, competitor patterns, and market gaps behind the recommendations."
            onClick={() => onOpen(marketResearch ?? currentAds!)}
          />
        ) : null}
        {recommendations ? (
          <SummaryButton
            title="What Blaze created"
            description="Recommended concepts and ready-to-use draft copy tied back to the evidence."
            onClick={() => onOpen(recommendations)}
          />
        ) : null}
        {scripts || recommendations ? (
          <SummaryButton
            title="What happens next"
            description="Choose the concepts, approve the scripts, then send each ad to recording or design."
            onClick={() => onOpen(scripts ?? recommendations!)}
          />
        ) : null}
      </div>

      <details className="surface-card border-border rounded-spacing-3 border">
        <summary className="p-spacing-4 gap-spacing-2 flex cursor-pointer items-center">
          <Search className="icon-sm text-muted-foreground" />
          <span className="body-2 text-foreground flex-1 font-semibold">
            Sources and deliverables ({ordered.length})
          </span>
          <ChevronDown className="icon-sm text-muted-foreground" />
        </summary>
        <div className="border-border p-spacing-3 gap-spacing-2 grid border-t md:grid-cols-2">
          {ordered.map((deliverable) => (
            <button
              key={deliverable.id}
              type="button"
              className="hover:bg-hover-subtle p-spacing-3 gap-spacing-2 rounded-spacing-2 flex items-center text-left transition-colors"
              onClick={() => onOpen(deliverable)}
            >
              <FileText className="icon-sm text-muted-foreground shrink-0" />
              <span className="body-3 text-foreground">{deliverableLabel(deliverable.title)}</span>
            </button>
          ))}
        </div>
      </details>
    </section>
  )
}
