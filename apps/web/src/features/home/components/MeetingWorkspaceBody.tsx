'use client'

import { ListSkeleton } from '@/components/ui/feedback/ListSkeleton'
import { MeetingActionItemsSection } from '@/features/home/components/MeetingActionItemsSection'
import { MeetingAgendaPrepSection } from '@/features/home/components/MeetingAgendaPrepSection'
import { MeetingNotesSection } from '@/features/home/components/MeetingNotesSection'
import { MeetingPostCallSections } from '@/features/home/components/MeetingPostCallSections'
import { MeetingRecordingsSection } from '@/features/home/components/MeetingRecordingsSection'
import { MeetingWorkspaceAttachments } from '@/features/home/components/MeetingWorkspaceAttachments'
import { HOME_AGENDA_MESSAGES } from '@/features/home/config/home-agenda-messages.config'
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
 * Recordings and action items sit in the top row. Agenda, recap, and notes follow.
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
  onRecordingLinked,
  onNoteCreated,
  onActionCreated,
  onActionsReload,
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
  onRecordingLinked: () => void
  onNoteCreated: (snippet: MeetingSnippet) => void
  onActionCreated: (action: MeetingAction) => void
  onActionsReload: () => Promise<void>
}) {
  if (loading) {
    return (
      <div className="section-card p-spacing-4">
        <ListSkeleton rows={6} label={HOME_AGENDA_MESSAGES.LOADING_MEETING_DETAILS.message} />
      </div>
    )
  }

  return (
    <>
      <div className="gap-spacing-4 flex flex-wrap items-start">
        <section className="section-card p-spacing-4 min-w-spacing-72 flex-1">
          <MeetingRecordingsSection
            spaceId={spaceId}
            meetingItemId={meetingItemId}
            recordings={bundle?.recordings ?? []}
            isPostCall={isPostCall || isLive}
            onLinked={onRecordingLinked}
            attachmentCount={bundle?.deliverables.length ?? 0}
          >
            <MeetingWorkspaceAttachments
              spaceId={spaceId}
              deliverables={bundle?.deliverables ?? []}
              loading={loading}
              embedded
            />
          </MeetingRecordingsSection>
        </section>

        <section className="section-card min-w-spacing-72 flex-1 overflow-hidden">
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
              onCreated={onActionCreated}
              onReload={onActionsReload}
            />
          </div>
        </section>
      </div>

      <section className="section-card p-spacing-4 gap-spacing-2 flex flex-col">
        <MeetingAgendaPrepSection
          spaceId={spaceId}
          agendaDocItemId={bundle?.workspace?.agenda_doc_item_id}
          agendaTitle={bundle?.meeting.title?.trim() || 'Agenda'}
          prep={prep}
          prepDescription={prepDescription}
          joinUrl={joinUrl}
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
    </>
  )
}
