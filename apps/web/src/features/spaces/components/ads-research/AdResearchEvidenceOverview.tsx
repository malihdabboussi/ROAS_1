import { ExternalLink, Sparkles } from 'lucide-react'
import { ADS_RESEARCH_MESSAGES } from '../../config/ads-research-messages.config'
import { ADS_PLATFORM_LABELS, type AdSearchResultItem } from '../../services/ads-research.service'

export interface AdResearchEvidenceContext {
  angleTitle: string
  query: string
}

function destinationLabel(url: string | null): string | null {
  if (!url) return null
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export function AdResearchEvidenceOverview({
  ad,
  researchContext,
  analyzing,
  analyzeError,
  onDeepAnalyze,
}: {
  ad: AdSearchResultItem
  researchContext?: AdResearchEvidenceContext
  analyzing: boolean
  analyzeError: string | null
  onDeepAnalyze: () => void
}) {
  const destination = destinationLabel(ad.landing_url)

  return (
    <div className="p-spacing-4 gap-spacing-4 flex flex-col overflow-y-auto">
      <div className="gap-spacing-1 flex flex-col">
        <p className="typo-section-label text-muted-foreground">RESEARCH EVIDENCE</p>
        <p className="body-3 text-foreground">
          {researchContext
            ? `Blaze saved this as evidence for ${researchContext.angleTitle}.`
            : 'This creative was saved as research evidence.'}
        </p>
        {researchContext?.query ? (
          <p className="body-4 text-muted-foreground">Search: {researchContext.query}</p>
        ) : null}
      </div>

      <dl className="surface-card border-border rounded-spacing-3 divide-border divide-y border">
        <div className="p-spacing-3 gap-spacing-1 flex flex-col">
          <dt className="typo-section-label text-muted-foreground">COPY</dt>
          <dd className="body-3 text-foreground whitespace-pre-wrap">
            {ad.creative_text || 'No ad copy was available from the source.'}
          </dd>
        </div>
        <div className="p-spacing-3 gap-spacing-1 flex flex-col">
          <dt className="typo-section-label text-muted-foreground">TRAFFIC SOURCE</dt>
          <dd className="body-3 text-foreground">
            {ADS_PLATFORM_LABELS[ad.platform] ?? ad.platform}
          </dd>
        </div>
        {destination ? (
          <div className="p-spacing-3 gap-spacing-1 flex flex-col">
            <dt className="typo-section-label text-muted-foreground">DESTINATION</dt>
            <dd>
              <a
                href={ad.landing_url ?? undefined}
                target="_blank"
                rel="noreferrer"
                className="body-3 text-primary gap-spacing-1 inline-flex items-center"
              >
                {destination}
                <ExternalLink className="icon-xs" />
              </a>
            </dd>
          </div>
        ) : null}
      </dl>

      <div className="surface-card border-border p-spacing-3 gap-spacing-3 rounded-spacing-3 flex flex-col border">
        <div>
          <p className="body-2 text-foreground font-semibold">Want the deeper breakdown?</p>
          <p className="body-4 text-muted-foreground mt-spacing-1">
            {ADS_RESEARCH_MESSAGES.DEEP_ANALYSIS_DESCRIPTION}
          </p>
        </div>
        {analyzeError ? <p className="body-3 text-destructive">{analyzeError}</p> : null}
        <button
          type="button"
          className="button-glass-primary button-compact gap-spacing-2 inline-flex items-center self-start"
          onClick={onDeepAnalyze}
          disabled={analyzing}
        >
          <Sparkles className="icon-sm" />
          {analyzing ? 'Deep analyzing…' : ADS_RESEARCH_MESSAGES.DEEP_ANALYZE_BUTTON}
        </button>
      </div>
    </div>
  )
}
