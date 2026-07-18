import { Rocket } from 'lucide-react'

function MissionEmptyMockup() {
  return (
    <div aria-hidden className="relative h-48 w-80 select-none">
      <div className="h-spacing-32 w-spacing-32 bg-muted-foreground absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-5 blur-3xl" />

      <div className="card-glass right-spacing-8 top-spacing-12 h-spacing-32 w-spacing-36 gap-spacing-1-5 p-spacing-2 absolute flex rotate-6 flex-col opacity-40 shadow-lg">
        {[1, 2, 3].map((i) => (
          <div key={i} className="gap-spacing-2 flex items-center">
            <div className="h-spacing-1.5 bg-muted-foreground w-2/5 rounded-full opacity-15" />
            <div className="h-spacing-4 w-spacing-14 border-border bg-secondary ml-auto shrink-0 rounded-full border" />
          </div>
        ))}
      </div>

      <div className="card-glass top-spacing-4 absolute left-1/2 flex h-44 w-56 -translate-x-1/2 -rotate-1 flex-col overflow-hidden p-0 shadow-2xl">
        <div className="h-spacing-6 gap-spacing-2 border-border bg-muted px-spacing-3 flex shrink-0 items-center border-b opacity-90">
          <Rocket className="icon-xs text-muted-foreground shrink-0 opacity-45" />
          <div className="h-spacing-2 bg-muted-foreground min-w-0 flex-1 rounded-full opacity-20" />
        </div>
        <div className="gap-spacing-2 p-spacing-3 flex flex-1 flex-col">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="gap-spacing-2 rounded-spacing-1 border-border bg-muted p-spacing-2 flex items-center border"
            >
              <div className="gap-spacing-1 flex min-w-0 flex-1 flex-col">
                <div className="h-spacing-1.5 bg-muted-foreground w-full rounded-full opacity-25" />
                <div className="h-spacing-4 rounded-spacing-1 bg-muted-foreground w-full opacity-10" />
              </div>
              <div className="h-spacing-5 w-spacing-14 border-border bg-secondary shrink-0 rounded-full border" />
            </div>
          ))}
        </div>
        <div className="px-spacing-3 pb-spacing-3 shrink-0 pt-0">
          <div className="h-spacing-2 bg-primary w-full rounded-full opacity-40" />
        </div>
      </div>
    </div>
  )
}

interface MissionsViewEmptyStateProps {
  hasAnyMissions: boolean
  onStartPlaybook?: () => void
}

export function MissionsViewEmptyState({
  hasAnyMissions,
  onStartPlaybook,
}: MissionsViewEmptyStateProps) {
  if (hasAnyMissions) {
    return (
      <div className="card-glass mx-auto max-w-md p-8 text-center">
        <p className="body-3 text-muted-foreground">No missions match filters.</p>
      </div>
    )
  }

  return (
    <div className="gap-spacing-6 px-spacing-8 pb-spacing-8 pt-spacing-4 flex flex-1 flex-col items-center justify-center text-center">
      <MissionEmptyMockup />
      <div className="space-y-spacing-2">
        <p className="title-h6 text-foreground">Start with the playbook</p>
        <p className="body-3 text-muted-foreground mx-auto max-w-sm">
          Webinar fulfillment is a guided mission: Atlas context, gated strategy, one complete Copy
          Package, Lux production, Blaze media planning, and final production approval. Freeform
          Mission is only if you need something outside that path.
        </p>
      </div>
      {onStartPlaybook ? (
        <button
          type="button"
          onClick={onStartPlaybook}
          className="badge-glass badge-glass-green body-3 rounded-spacing-2 px-spacing-4 py-spacing-2 font-semibold"
        >
          Start Webinar Fulfillment
        </button>
      ) : null}
    </div>
  )
}
