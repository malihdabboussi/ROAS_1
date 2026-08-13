'use client'

import { MeetingActionItemsSection } from '@/features/home/components/MeetingActionItemsSection'
import { MeetingAgendaPrepSection } from '@/features/home/components/MeetingAgendaPrepSection'
import { MeetingNotesSection } from '@/features/home/components/MeetingNotesSection'
import { MeetingPostCallSections } from '@/features/home/components/MeetingPostCallSections'
import { MeetingRecordingsSection } from '@/features/home/components/MeetingRecordingsSection'
import { MeetingWorkspaceAttachments } from '@/features/home/components/MeetingWorkspaceAttachments'
import type { ParsedMeetingPrep } from '@/features/home/lib/meeting-workspace-display'
import type {
  MeetingAction,
  MeetingSnippet,
  MeetingWorkspaceBundle,
} from '@/features/home/services/meeting-workspace-api'

function SectionTitle({ children, count }: { children: string; count?: number }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="body-3 text-foreground font-semibold">{children}</h2>
      {typeof count === 'number' ? (
        <span className="body-4 text-muted-foreground">{count}</span>
      ) : null}
    </div>
  )
}

/**
 * The section stack of the meeting workspace: recordings & attachments up top,
 * agenda & prep, then post-call recap, notes, and the action-item list.
 */
export function MeetingWorkspaceBody({
  spaceId,
  meetingItemId,
  bundle,
  loading,
  isLive,
  isPostCall,
  prep,
  prepDescription,
  joinUrl,
  agendaDocLink,
  onOpenPrep,
  onRecordingLinked,
  onNoteCreated,
  onToggleAction,
  onActionCreated,
  onActionMoved,
}: {
  spaceId: string
  meetingItemId: string
  bundle: MeetingWorkspaceBundle | null
  loading: boolean
  isLive: boolean
  isPostCall: boolean
  prep: ParsedMeetingPrep
  prepDescription: string | null | undefined
  joinUrl: string | null
  agendaDocLink?: string | null
  onOpenPrep?: () => void
  onRecordingLinked: () => void
  onNoteCreated: (snippet: MeetingSnippet) => void
  onToggleAction: (action: MeetingAction) => void
  onActionCreated: (action: MeetingAction) => void
  onActionMoved: (action: MeetingAction) => void
}) {
  return (
    <>
      <section className="section-card overflow-hidden">
        <div className="p-spacing-4">
          <MeetingRecordingsSection
            spaceId={spaceId}
            meetingItemId={meetingItemId}
            recordings={bundle?.recordings ?? []}
            isPostCall={isPostCall || isLive}
            onLinked={onRecordingLinked}
          />
        </div>
        <div className="border-border p-spacing-4 border-t">
          <MeetingWorkspaceAttachments
            spaceId={spaceId}
            deliverables={bundle?.deliverables ?? []}
            loading={loading}
          />
        </div>
      </section>

      <section className="section-card p-spacing-4 gap-spacing-2 flex flex-col">
        <MeetingAgendaPrepSection
          prep={prep}
          prepDescription={prepDescription}
          joinUrl={joinUrl}
          agendaDocLink={agendaDocLink}
          onOpenPrep={onOpenPrep}
        />
      </section>

      {isPostCall ? (
        <section className="section-card p-spacing-4 gap-spacing-3 flex flex-col">
          <SectionTitle>Post-meeting recap</SectionTitle>
          <MeetingPostCallSections recordings={bundle?.recordings ?? []} />
        </section>
      ) : null}

      <section className="section-card p-spacing-4">
        <MeetingNotesSection
          spaceId={spaceId}
          meetingItemId={meetingItemId}
          snippets={bundle?.snippets ?? []}
          onCreated={onNoteCreated}
        />
      </section>

      <section className="section-card overflow-hidden">
        {bundle?.continuity.unresolved_commitments.length ? (
          <div className="border-border p-spacing-4 border-b">
            <SectionTitle count={bundle.continuity.unresolved_commitments.length}>
              Open loops
            </SectionTitle>
            <div className="mt-spacing-3 gap-spacing-2 flex flex-col">
              {bundle.continuity.unresolved_commitments.map((action) => (
                <p key={action.id} className="body-3 text-foreground">
                  {action.title}
                </p>
              ))}
            </div>
          </div>
        ) : null}
        <div className="p-spacing-4">
          <MeetingActionItemsSection
            spaceId={spaceId}
            meetingItemId={meetingItemId}
            actions={bundle?.actions ?? []}
            loading={loading}
            onToggle={onToggleAction}
            onCreated={onActionCreated}
            onMoved={onActionMoved}
          />
        </div>
      </section>
    </>
  )
}
