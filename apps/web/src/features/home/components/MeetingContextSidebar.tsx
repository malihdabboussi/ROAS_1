import { ExternalLink, Radio } from 'lucide-react'
import type { MeetingWorkspaceBundle } from '@/features/home/services/meeting-workspace-api'

function SidebarSectionTitle({ children, count }: { children: string; count?: number }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="body-3 text-foreground font-semibold">{children}</h2>
      {typeof count === 'number' ? (
        <span className="badge-glass badge-glass-muted">{count}</span>
      ) : null}
    </div>
  )
}

export function MeetingContextSidebar({
  bundle,
  onOpenPrep,
}: {
  bundle: MeetingWorkspaceBundle | null
  onOpenPrep?: () => void
}) {
  return (
    <aside className="border-border gap-spacing-4 p-spacing-4 hidden w-64 shrink-0 flex-col overflow-y-auto border-l xl:flex">
      <section className="gap-spacing-2 flex flex-col">
        <SidebarSectionTitle>Agenda & prep</SidebarSectionTitle>
        <p className="body-4 text-muted-foreground whitespace-pre-wrap">
          {bundle?.meeting.description || 'No agenda has been added yet.'}
        </p>
        {onOpenPrep ? (
          <button
            type="button"
            onClick={onOpenPrep}
            className="button-compact button-glass-neutral self-start"
          >
            Open agenda prep
          </button>
        ) : null}
      </section>
      <section className="gap-spacing-2 flex flex-col">
        <SidebarSectionTitle count={bundle?.continuity.unresolved_commitments.length ?? 0}>
          Open loops
        </SidebarSectionTitle>
        {bundle?.continuity.unresolved_commitments.map((action) => (
          <p key={action.id} className="body-4 text-foreground">
            {action.title}
          </p>
        ))}
        {bundle?.continuity.unresolved_commitments.length === 0 ? (
          <p className="body-4 text-muted-foreground">No unresolved prior commitments.</p>
        ) : null}
      </section>
      <section className="gap-spacing-2 flex flex-col">
        <SidebarSectionTitle count={bundle?.recordings.length ?? 0}>Recordings</SidebarSectionTitle>
        {bundle?.recordings.map((recording) => (
          <div key={recording.id} className="section-card p-spacing-3">
            <div className="gap-spacing-2 flex items-center">
              <Radio className="icon-sm text-primary" aria-hidden />
              <span className="body-4 text-foreground truncate">{recording.title}</span>
            </div>
            <p className="typo-caption text-muted-foreground mt-spacing-1">
              {recording.is_primary ? 'Primary recording' : 'Supplemental recording'}
            </p>
            {recording.recording_url ? (
              <a
                href={recording.recording_url}
                target="_blank"
                rel="noopener noreferrer"
                className="typo-caption text-primary mt-spacing-2 gap-spacing-1 inline-flex items-center"
              >
                Open recording <ExternalLink className="icon-xs" />
              </a>
            ) : null}
          </div>
        ))}
      </section>
    </aside>
  )
}
