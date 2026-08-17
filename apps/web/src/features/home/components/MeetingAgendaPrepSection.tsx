'use client'

import { ExternalLink } from 'lucide-react'
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
  agendaDocLink,
  onOpenPrep,
}: {
  spaceId: string
  agendaDocItemId?: string | null
  agendaTitle: string
  prep: ParsedMeetingPrep
  prepDescription: string | null | undefined
  joinUrl: string | null
  agendaDocLink?: string | null
  onOpenPrep?: () => void
}) {
  const hasAgendaDoc = Boolean(agendaDocItemId?.trim())
  return (
    <>
      <h2 className="body-3 text-foreground font-semibold">Agenda & prep</h2>
      {hasAgendaDoc && agendaDocItemId ? (
        <MeetingAgendaDocEditor spaceId={spaceId} itemId={agendaDocItemId} title={agendaTitle} />
      ) : prep.notes ? (
        <div className="body-4">
          <MarkdownRenderer compact>{prep.notes}</MarkdownRenderer>
        </div>
      ) : (
        <p className="body-4 text-muted-foreground">
          {HOME_AGENDA_MESSAGES.AGENDA_EMPTY.message}
          {onOpenPrep ? ', or open agenda prep' : ''}.
        </p>
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
            Meeting link <ExternalLink className="icon-xs" aria-hidden />
          </a>
        ) : null}
        {agendaDocLink ? (
          <a
            href={agendaDocLink}
            target="_blank"
            rel="noopener noreferrer"
            className="body-4 text-primary gap-spacing-1 inline-flex items-center"
          >
            Open Google agenda <ExternalLink className="icon-xs" aria-hidden />
          </a>
        ) : null}
        {prep.meetingId ? (
          <span className="typo-caption text-muted-foreground">ID {prep.meetingId}</span>
        ) : null}
        {prep.passcode ? (
          <span className="typo-caption text-muted-foreground">Passcode {prep.passcode}</span>
        ) : null}
      </div>
      {onOpenPrep ? (
        <button
          type="button"
          onClick={onOpenPrep}
          className="button-compact button-glass-neutral self-start"
        >
          Open agenda prep
        </button>
      ) : null}
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
