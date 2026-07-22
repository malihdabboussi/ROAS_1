import { ArrowRight, FileText, FlaskConical, Images, Layers3 } from 'lucide-react'
import type { Mission, MissionDeliverable } from '@/lib/missions'
import type { SavedAdSearchSummary } from '../../services/ads-research.service'

function statusBadge(status: string): string {
  if (status === 'failed' || status === 'blocked') return 'badge-glass-red'
  if (status === 'done' || status === 'complete') return 'badge-glass-green'
  if (status === 'awaiting_human' || status === 'pending') return 'badge-glass-orange'
  return 'badge-glass-muted'
}

function updatedLabel(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'Updated recently'
  return `Updated ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
}

export function AdsResearchRunCard({
  run,
  deliverables,
  searches,
  onOpen,
}: {
  run: Mission
  deliverables: MissionDeliverable[]
  searches: SavedAdSearchSummary[]
  onOpen: () => void
}) {
  const done = run.subtask_done ?? 0
  const total = run.subtask_total ?? 0
  const visualAds = searches.reduce((sum, search) => sum + search.result_count, 0)

  return (
    <button
      type="button"
      className="surface-card border-border p-spacing-4 hover:bg-hover-subtle rounded-spacing-3 flex flex-col border text-left transition-colors"
      onClick={onOpen}
    >
      <div className="gap-spacing-3 flex items-start justify-between">
        <div className="min-w-0">
          <p className="body-2 text-foreground truncate font-semibold">{run.brief || run.title}</p>
          <p className="body-4 text-muted-foreground mt-spacing-1">
            {updatedLabel(run.updated_at)}
          </p>
        </div>
        <div className="gap-spacing-2 flex shrink-0 items-center">
          <span className={`badge-glass ${statusBadge(run.status)} typo-caption font-medium`}>
            {run.status.replaceAll('_', ' ')}
          </span>
          <ArrowRight className="icon-sm text-muted-foreground" />
        </div>
      </div>

      <div className="gap-spacing-2 mt-spacing-3 flex flex-wrap">
        <span className="badge-glass badge-glass-muted body-4 gap-spacing-1 inline-flex items-center">
          <Layers3 className="icon-xs" />
          {searches.length} {searches.length === 1 ? 'angle' : 'angles'}
        </span>
        <span className="badge-glass badge-glass-muted body-4 gap-spacing-1 inline-flex items-center">
          <Images className="icon-xs" />
          {visualAds} visual ads
        </span>
        <span className="badge-glass badge-glass-muted body-4 gap-spacing-1 inline-flex items-center">
          <FileText className="icon-xs" />
          {deliverables.length} outputs
        </span>
      </div>

      <div className="gap-spacing-2 mt-spacing-3 flex flex-wrap">
        {deliverables.slice(0, 2).map((deliverable) => (
          <span
            key={deliverable.id}
            className="badge-glass badge-glass-muted body-4 gap-spacing-1 rounded-spacing-2 px-spacing-2 py-spacing-1 inline-flex items-center"
          >
            <FileText className="icon-xs" />
            {deliverable.title.replace(/^ADS-R#\d+\s*-\s*/, '')}
          </span>
        ))}
        {deliverables.length > 2 ? (
          <span className="body-4 text-muted-foreground py-spacing-1">
            +{deliverables.length - 2} more outputs
          </span>
        ) : null}
        {deliverables.length === 0 ? (
          <span className="body-4 text-muted-foreground gap-spacing-1 inline-flex items-center">
            <FlaskConical className="icon-xs" /> Research is being assembled
          </span>
        ) : null}
      </div>
      <p className="body-4 text-muted-foreground mt-spacing-3">
        {done}/{total || 6} workflow steps complete
      </p>
    </button>
  )
}
