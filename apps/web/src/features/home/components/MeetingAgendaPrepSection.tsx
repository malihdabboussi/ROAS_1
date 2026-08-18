'use client'

import { Sparkles } from 'lucide-react'
import { MarkdownRenderer } from '@/components/ui/markdown-renderer'
import { MeetingAgendaDocEditor } from '@/features/home/components/MeetingAgendaDocEditor'
import { HOME_AGENDA_MESSAGES } from '@/features/home/config/home-agenda-messages.config'
import type { ParsedMeetingPrep } from '@/features/home/lib/meeting-workspace-display'

export function MeetingAgendaPrepSection({
  spaceId,
  agendaDocItemId,
  agendaTitle,
  prep,
  prepDescription,
  joinUrl,
  onCreateWithAi,
}: {
  spaceId: string
  agendaDocItemId?: string | null
  agendaTitle: string
  prep: ParsedMeetingPrep
  prepDescription: string | null | undefined
  joinUrl: string | null
  onCreateWithAi?: () => void
}) {
  const hasAgendaDoc = Boolean(agendaDocItemId?.trim())
  return (
    <>
      <div className="gap-spacing-2 flex items-center justify-between">
        <h2 className="body-3 text-foreground font-semibold">Agenda & prep</h2>
        {onCreateWithAi ? (
          <button
            type="button"
            onClick={onCreateWithAi}
            className="button-compact button-glass-primary gap-spacing-1 inline-flex items-center"
          >
            <Sparkles className="icon-xs" aria-hidden />
            {HOME_AGENDA_MESSAGES.CREATE_WITH_AI.message}
          </button>
        ) : null}
      </div>
      {hasAgendaDoc && agendaDocItemId ? (
        <MeetingAgendaDocEditor spaceId={spaceId} itemId={agendaDocItemId} title={agendaTitle} />
      ) : prep.notes ? (
        <div className="body-4">
          <MarkdownRenderer compact>{prep.notes}</MarkdownRenderer>
        </div>
      ) : (
        <p className="body-4 text-muted-foreground">{HOME_AGENDA_MESSAGES.AGENDA_EMPTY.message}</p>
      )}
      {hasAgendaDoc && prep.notes ? (
        <details className="mt-spacing-1">
          <summary className="typo-caption text-muted-foreground cursor-pointer select-none">
            Calendar invite notes
          </summary>
          <div className="body-4 mt-spacing-2">
            <MarkdownRenderer compact>{prep.notes}</MarkdownRenderer>
          </div>
        </details>
      ) : null}
      <div className="gap-spacing-3 flex flex-wrap items-center">
        {joinUrl ? (
          <a
            href={joinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="body-4 text-primary gap-spacing-1 inline-flex items-center"
          >
            Meeting link
          </a>
        ) : null}
        {prep.meetingId ? (
          <span className="typo-caption text-muted-foreground">ID {prep.meetingId}</span>
        ) : null}
        {prep.passcode ? (
          <span className="typo-caption text-muted-foreground">Passcode {prep.passcode}</span>
        ) : null}
      </div>
      {prep.strippedBoilerplate && prepDescription ? (
        <details className="mt-spacing-1">
          <summary className="typo-caption text-muted-foreground cursor-pointer select-none">
            Original invite
          </summary>
          <p className="typo-caption text-muted-foreground mt-spacing-2 whitespace-pre-wrap">
            {prepDescription.replace(/<br\s*\/?\s*>/gi, '\n').replace(/<[^>]+>/g, '')}
          </p>
        </details>
      ) : null}
    </>
  )
}
