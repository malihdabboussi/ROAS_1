import { ArrowRight, FileText, FlaskConical } from 'lucide-react'
import type { Mission, MissionDeliverable } from '@/lib/missions'

export function AdsResearchRunCard({
  run,
  deliverables,
  onOpen,
}: {
  run: Mission
  deliverables: MissionDeliverable[]
  onOpen: () => void
}) {
  const done = run.subtask_done ?? 0
  const total = run.subtask_total ?? 0

  return (
    <button
      type="button"
      className="card-glass p-spacing-4 hover:bg-hover-subtle rounded-spacing-3 flex flex-col border-0 text-left transition-colors"
      onClick={onOpen}
    >
      <div className="gap-spacing-3 flex items-start justify-between">
        <div className="min-w-0">
          <p className="body-2 text-foreground truncate font-semibold">{run.brief || run.title}</p>
          <p className="body-4 text-muted-foreground mt-spacing-1">
            {done}/{total || 6} steps · {run.status.replaceAll('_', ' ')}
          </p>
        </div>
        <ArrowRight className="icon-sm text-muted-foreground shrink-0" />
      </div>
      <div className="gap-spacing-2 mt-spacing-3 flex flex-wrap">
        {deliverables.slice(0, 4).map((deliverable) => (
          <span
            key={deliverable.id}
            className="badge-glass badge-glass-muted body-4 gap-spacing-1 rounded-spacing-2 px-spacing-2 py-spacing-1 inline-flex items-center"
          >
            <FileText className="icon-xs" />
            {deliverable.title.replace(/^ADS-R#\d+\s*-\s*/, '')}
          </span>
        ))}
        {deliverables.length === 0 ? (
          <span className="body-4 text-muted-foreground gap-spacing-1 inline-flex items-center">
            <FlaskConical className="icon-xs" /> Research is being assembled
          </span>
        ) : null}
      </div>
    </button>
  )
}
