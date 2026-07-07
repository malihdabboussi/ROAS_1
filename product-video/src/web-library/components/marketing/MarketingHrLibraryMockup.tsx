'use client'

import { ExternalLink, Plus, AlertCircle, TrendingUp, UserPlus } from 'lucide-react'
import { FeatureFloatingMockShell } from '@/components/feature-pages/FeatureFloatingMockShell'
import { MarketingRoleEmblem } from '@/components/marketing/MarketingRoleEmblem'
import type { MarketingHrShowcasePayload } from '@/lib/marketing-hr-showcase-data'

export function MarketingHrLibraryMockup({ data }: { data: MarketingHrShowcasePayload }) {
  const { hr, insights, nextHire } = data

  return (
    <FeatureFloatingMockShell>
      <div className="relative min-h-[420px]">
        {/* HR Insights Card */}
        <div
          className="glass-card absolute right-5 top-6 z-10 flex w-[min(100%,340px)] max-w-[340px] max-h-[360px] flex-col gap-4 overflow-hidden p-5 sm:right-6"
          style={{ transform: 'rotate(1.5deg)' }}
        >
          <div className="flex shrink-0 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="border-color-glass h-12 w-12 shrink-0 overflow-hidden rounded-full border-2">
                <img src={hr.imageUrl} alt="" className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0">
                <h3 className="body-2 font-bold text-white">HR Insights</h3>
                <p className="text-[10px] text-text-muted font-medium uppercase tracking-wider">
                  Team Intelligence
                </p>
              </div>
            </div>
            <div className="indicator-dot-glass indicator-dot-glass-green h-2 w-2 rounded-full" />
          </div>

          <div className="bg-color-subtle flex min-h-0 flex-1 flex-col gap-4 overflow-hidden rounded-xl border border-white/5 p-4">
            <div className="space-y-3 overflow-y-auto pr-1 scrollbar-thin">
              {/* Team Gaps */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <AlertCircle size={12} className="text-amber-400" />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/90">
                    High Priority Gaps
                  </p>
                </div>
                {insights.team_gaps.map((gap, i) => (
                  <div
                    key={i}
                    className="group border-color-glass bg-white/[0.02] flex flex-col gap-1 rounded-lg border px-3 py-2 transition-colors hover:bg-white/[0.04]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] font-semibold leading-tight text-white">
                        {gap.gap}
                      </p>
                      <span
                        className={`text-[9px] shrink-0 font-bold uppercase tracking-tighter ${
                          gap.severity === 'critical'
                            ? 'text-red-400'
                            : gap.severity === 'high'
                              ? 'text-amber-400'
                              : 'text-amber-200'
                        }`}
                      >
                        {gap.severity}
                      </span>
                    </div>
                    <p className="text-[10px] leading-relaxed text-text-muted line-clamp-2">
                      {gap.evidence}
                    </p>
                  </div>
                ))}
              </div>

              {/* Team Structure */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 pt-1">
                  <TrendingUp size={12} className="text-emerald-400" />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/90">
                    Structure Analysis
                  </p>
                </div>
                <div className="border-color-glass bg-white/[0.02] flex flex-col gap-2 rounded-lg border px-3 py-2">
                  <p className="text-[10px] leading-relaxed text-text-muted">
                    {insights.team_structure.summary}
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {insights.team_structure.strengths.slice(0, 2).map((s, j) => (
                      <div key={j} className="badge-glass badge-glass-green text-[9px] font-medium">
                        {s}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="button-glass-primary body-3 group flex w-full items-center justify-center gap-2 rounded-xl py-2.5 font-bold transition-all"
          >
            Refresh Intel
            <ExternalLink className="h-3 w-3 shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </button>
        </div>

        {/* Next Hire Recommendation Card */}
        <div
          className="glass-card absolute bottom-6 left-4 z-30 flex w-[min(100%,310px)] max-w-[310px] flex-col gap-4 p-5 shadow-2xl"
          style={{ transform: 'rotate(-2deg)' }}
        >
          <div className="flex items-center gap-2.5">
            <div className="bg-amber-400/10 flex h-8 w-8 items-center justify-center rounded-lg border border-amber-400/20">
              <UserPlus size={16} className="text-amber-400" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Recommended Hire
              </h3>
              <p className="text-[9px] text-text-muted font-medium">Based on campaign needs</p>
            </div>
          </div>

          <div className="bg-amber-400/[0.03] flex flex-col gap-3 rounded-xl border border-amber-400/10 p-4">
            <div className="flex items-center gap-3">
              <MarketingRoleEmblem roleKey={nextHire.roleKey} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="body-3 truncate font-bold text-white leading-tight">
                  {nextHire.displayName}
                </p>
                <p className="text-[10px] text-amber-400/80 font-medium truncate">
                  {nextHire.role}
                </p>
              </div>
              <button
                type="button"
                className="bg-amber-400 text-black flex h-7 w-7 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-110 active:scale-95"
                aria-label={`Add ${nextHire.displayName}`}
              >
                <Plus size={14} strokeWidth={3} />
              </button>
            </div>
            <div className="relative">
              <div className="absolute -left-2 top-0 bottom-0 w-0.5 bg-amber-400/20 rounded-full" />
              <p className="text-[10px] leading-relaxed text-text-muted pl-2 italic">
                &ldquo;{nextHire.reason}&rdquo;
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-1.5 opacity-50">
            <div className="h-1 w-1 rounded-full bg-white" />
            <div className="h-1 w-1 rounded-full bg-white/30" />
            <div className="h-1 w-1 rounded-full bg-white/30" />
          </div>
        </div>
      </div>
    </FeatureFloatingMockShell>
  )
}

