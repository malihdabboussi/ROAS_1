import type { HrInsightsData } from './ready-employees-modal.types'

export interface HrInsightsTeamBodyProps {
  hrInsights: HrInsightsData
}

export function HrInsightsTeamBody({ hrInsights }: HrInsightsTeamBodyProps) {
  return (
    <>
      <p className="body-4 text-foreground font-semibold uppercase tracking-wide">Team Gaps</p>
      {hrInsights.team_gaps.map((gap, i) => (
        <div
          key={i}
          className="card-glass-panel rounded-spacing-2 flex flex-col gap-1 border-0 px-3 py-2"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="body-3 text-foreground font-medium leading-tight">{gap.gap}</p>
            <span
              className={`body-4 shrink-0 font-medium ${gap.severity === 'critical' ? 'badge-glass badge-glass-sm badge-glass-red' : gap.severity === 'high' ? 'badge-glass badge-glass-sm badge-glass-orange' : 'badge-glass badge-glass-sm badge-glass-yellow'}`}
            >
              {gap.severity}
            </span>
          </div>
          <p className="body-3 text-muted-foreground leading-snug">{gap.evidence}</p>
        </div>
      ))}
      <p className="body-4 text-foreground mt-2 font-semibold uppercase tracking-wide">
        Team Structure
      </p>
      <div className="card-glass-panel rounded-spacing-2 flex flex-col gap-2 border-0 px-3 py-2">
        <p className="body-3 text-muted-foreground leading-snug">
          {hrInsights.team_structure.summary}
        </p>
        {hrInsights.team_structure.strengths.length > 0 && (
          <div>
            <p className="body-4 text-foreground mb-1 font-medium">Strengths</p>
            {hrInsights.team_structure.strengths.map((s, i) => (
              <div key={i} className="mb-0.5 flex items-start gap-1.5">
                <span className="indicator-dot-glass indicator-dot-glass-green mt-1 shrink-0" />
                <p className="body-3 text-muted-foreground leading-snug">{s}</p>
              </div>
            ))}
          </div>
        )}
        {hrInsights.team_structure.improvements.length > 0 && (
          <div>
            <p className="body-4 text-foreground mb-1 font-medium">Improvements</p>
            {hrInsights.team_structure.improvements.map((s, i) => (
              <div key={i} className="mb-0.5 flex items-start gap-1.5">
                <span className="indicator-dot-glass indicator-dot-glass-orange mt-1 shrink-0" />
                <p className="body-3 text-muted-foreground leading-snug">{s}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
