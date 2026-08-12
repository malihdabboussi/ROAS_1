'use client'

import { ExternalLink } from 'lucide-react'
import { MarkdownRenderer } from '@/components/ui/markdown-renderer'
import type { ParsedMeetingPrep } from '@/features/home/lib/meeting-workspace-display'

export function MeetingAgendaPrepSection({
  prep,
  prepDescription,
  joinUrl,
  onOpenPrep,
}: {
  prep: ParsedMeetingPrep
  prepDescription: string | null | undefined
  joinUrl: string | null
  onOpenPrep?: () => void
}) {
  return (
    <>
      <h2 className="body-3 text-foreground font-semibold">Agenda & prep</h2>
      {prep.notes ? (
        <div className="body-4">
          <MarkdownRenderer compact>{prep.notes}</MarkdownRenderer>
        </div>
      ) : (
        <p className="body-4 text-muted-foreground">
          No agenda notes yet — kick one off with Start agenda above
          {onOpenPrep ? ', or open agenda prep' : ''}.
        </p>
      )}
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
