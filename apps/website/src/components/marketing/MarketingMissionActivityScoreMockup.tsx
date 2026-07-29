'use client'

import { VIBEY_MARKETING_PORTRAIT_FALLBACK } from '@/lib/agent-library-fallback'
import { FeatureFloatingMockShell } from '@/components/feature-pages/FeatureFloatingMockShell'

type QualityEvalDemo = {
  qualityScore: number
  dimensionScores: Record<string, number>
  strengths: string[]
  weaknesses: string[]
}

const DIMENSION_LABELS: Record<string, string> = {
  intent_alignment: 'Intent',
  craft: 'Craft',
  originality: 'Original',
  brand_coherence: 'Brand',
  completeness: 'Complete',
}

const DEMO_QUALITY_EVAL: QualityEvalDemo = {
  qualityScore: 8.2,
  dimensionScores: {
    intent_alignment: 8,
    craft: 9,
    originality: 7,
    brand_coherence: 8,
    completeness: 8,
  },
  strengths: ['Clear CTA hierarchy', 'On-brand voice'],
  weaknesses: ['Could tighten hero headline'],
}

function scoreColorClass(score: number): string {
  if (score >= 8) return 'text-emerald-400'
  if (score >= 6) return 'text-emerald-500'
  if (score >= 4) return 'text-amber-400'
  return 'text-red-400'
}

function QualityEvalScorecardMarketing({ data }: { data: QualityEvalDemo }) {
  const overall = data.qualityScore
  const dims = data.dimensionScores
  const strengths = data.strengths
  const weaknesses = data.weaknesses

  return (
    <div className="rounded-spacing-2 mt-spacing-2 space-y-2 border border-solid border-section bg-color-subtle p-spacing-3">
      <div className="flex items-center gap-3">
        <div className={`text-2xl font-bold leading-none ${scoreColorClass(overall)}`}>
          {overall.toFixed(1)}
        </div>
        <div className="min-w-0">
          <p className="body-4 font-medium uppercase tracking-wide text-emerald-accent">
            Quality evaluation
          </p>
          <p className="body-4 text-text-muted opacity-50">Independent eval</p>
        </div>
      </div>

      {Object.keys(dims).length > 0 && (
        <div className="space-y-1">
          {Object.entries(dims).map(([key, val]) => (
            <div key={key} className="flex items-center gap-2">
              <span className="body-4 text-text-muted w-14 shrink-0">{DIMENSION_LABELS[key] ?? key}</span>
              <div className="progress-bar-track flex-1">
                <div className="progress-bar-fill" style={{ width: `${(val / 10) * 100}%` }} />
              </div>
              <span className="body-4 text-text-muted w-5 text-right">{val}</span>
            </div>
          ))}
        </div>
      )}

      {(strengths.length > 0 || weaknesses.length > 0) && (
        <div className="flex flex-wrap gap-1">
          {strengths.map((s, i) => (
            <span key={`s-${i}`} className="badge-glass badge-glass-green body-4 font-medium">
              {s.length > 60 ? `${s.slice(0, 57)}...` : s}
            </span>
          ))}
          {weaknesses.map((w, i) => (
            <span key={`w-${i}`} className="badge-glass badge-glass-orange body-4 font-medium">
              {w.length > 60 ? `${w.slice(0, 57)}...` : w}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export function MarketingMissionActivityScoreMockup(props?: { vibeyPortraitUrl?: string }) {
  const vibeySrc =
    props?.vibeyPortraitUrl != null && String(props.vibeyPortraitUrl).trim() !== ''
      ? String(props.vibeyPortraitUrl).trim()
      : VIBEY_MARKETING_PORTRAIT_FALLBACK

  return (
    <FeatureFloatingMockShell className="compare-hero-card-shell--auto-height !min-h-[420px]">
      <div className="relative flex min-h-[420px] w-full flex-col">
        <div className="min-h-0 flex-1 px-5 pb-5 pt-4">
          <div className="relative">
            <div
              className="absolute bottom-2 left-[5px] top-[10.5px] w-px -translate-x-1/2"
              style={{ background: 'var(--divider-line)' }}
            />
            <div className="space-y-5">
              <div className="relative flex pl-6 opacity-40">
                <div className="indicator-dot-glass absolute left-[5px] top-1.5 z-10 h-[9px] w-[9px] shrink-0 -translate-x-1/2 bg-white/20" />
                <div className="min-w-0 flex-1">
                  <span className="body-2 font-medium text-white/60">Mission initialized</span>
                  <span className="body-4 mt-0.5 block text-text-muted opacity-50">12 minutes ago</span>
                </div>
              </div>

              <div className="relative flex pl-6 opacity-60">
                <div className="indicator-dot-glass absolute left-[5px] top-1.5 z-10 h-[9px] w-[9px] shrink-0 -translate-x-1/2 bg-white/20" />
                <div className="min-w-0 flex-1">
                  <span className="body-2 font-medium text-white/80">Researching audience segments</span>
                  <span className="body-4 mt-0.5 block text-text-muted opacity-50">8 minutes ago</span>
                </div>
              </div>

              <div className="relative flex pl-6">
                <div className="indicator-dot-glass indicator-dot-glass-green absolute left-[5px] top-1.5 z-10 h-[11px] w-[11px] shrink-0 -translate-x-1/2" />
                <div className="min-w-0 flex-1 pb-1">
                  <div className="flex items-start justify-between gap-2">
                    <span className="body-2 font-medium text-white">Execution completed</span>
                    <div className="flex shrink-0 items-center gap-2">
                      <div className="border-color-glass h-8 w-8 shrink-0 overflow-hidden rounded-full border">
                        <img src={vibeySrc} alt="" className="h-full w-full object-cover" />
                      </div>
                      <span className="body-2 text-text-muted">Pixel</span>
                    </div>
                  </div>
                  <span className="body-4 mt-0.5 block text-text-muted opacity-50">Just now</span>
                  <QualityEvalScorecardMarketing data={DEMO_QUALITY_EVAL} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </FeatureFloatingMockShell>
  )
}
