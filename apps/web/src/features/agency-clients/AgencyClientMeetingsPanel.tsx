import Link from 'next/link'
import { CalendarDays, ExternalLink, FileText } from 'lucide-react'
import type { AgencyClientWorkspace } from '@/lib/agency-clients'
import { formatAgencyDate } from './agency-client-format'

export function AgencyClientMeetingsPanel({
  campaignId,
  workspace,
}: {
  campaignId: string
  workspace: AgencyClientWorkspace
}) {
  const notes = workspace.meetings?.notes ?? []
  const agendas = workspace.meetings?.agendas ?? []

  return (
    <div className="gap-spacing-4 grid lg:grid-cols-2">
      <MeetingList
        title="Meeting notes"
        empty="No linked meeting notes yet."
        rows={notes}
        icon={CalendarDays}
        titleFor={(row) => String(row.meeting_title || 'Untitled meeting')}
        dateFor={(row) => String(row.meeting_date || row.created_at || '')}
        hrefFor={(row) => stringValue(row.source_url) || stringValue(row.fathom_url)}
      />
      <MeetingList
        title="Meeting agendas"
        empty="No client meeting agendas yet."
        rows={agendas}
        icon={FileText}
        titleFor={(row) => String(row.doc_tab_name || 'Meeting agenda')}
        dateFor={(row) => String(row.meeting_date || row.created_at || '')}
        hrefFor={() => ''}
      />
      <section className="surface-card rounded-spacing-3 border-border p-spacing-4 border lg:col-span-2">
        <p className="body-3 text-muted-foreground">
          The unified Meetings surface remains the place to prepare calls, review recordings, and
          manage meeting actions. This tab is the client-filtered history.
        </p>
        <Link
          href={`/home/meetings?campaign=${encodeURIComponent(campaignId)}`}
          className="button-compact button-glass-neutral mt-spacing-3"
        >
          Open unified Meetings
        </Link>
      </section>
    </div>
  )
}

function MeetingList({
  title,
  empty,
  rows,
  icon: Icon,
  titleFor,
  dateFor,
  hrefFor,
}: {
  title: string
  empty: string
  rows: Array<Record<string, unknown>>
  icon: typeof CalendarDays
  titleFor: (row: Record<string, unknown>) => string
  dateFor: (row: Record<string, unknown>) => string
  hrefFor: (row: Record<string, unknown>) => string
}) {
  return (
    <section className="surface-card rounded-spacing-3 border-border p-spacing-5 border">
      <div className="gap-spacing-2 flex items-center">
        <Icon className="icon-sm text-muted-foreground" />
        <h2 className="body-2 text-foreground font-semibold">{title}</h2>
      </div>
      <div className="mt-spacing-4 gap-spacing-2 flex flex-col">
        {rows.length ? (
          rows.map((row) => {
            const href = hrefFor(row)
            const content = (
              <>
                <span className="min-w-0 flex-1">
                  <span className="body-3 text-foreground block truncate font-medium">
                    {titleFor(row)}
                  </span>
                  <span className="body-4 text-muted-foreground block">
                    {formatAgencyDate(dateFor(row))}
                  </span>
                </span>
                {href ? <ExternalLink className="icon-xs text-muted-foreground" /> : null}
              </>
            )
            return href ? (
              <a
                key={String(row.id)}
                href={href}
                target="_blank"
                rel="noreferrer"
                className="rounded-spacing-2 border-border hover:bg-hover-subtle gap-spacing-2 px-spacing-3 py-spacing-2 flex items-center border"
              >
                {content}
              </a>
            ) : (
              <div
                key={String(row.id)}
                className="rounded-spacing-2 border-border gap-spacing-2 px-spacing-3 py-spacing-2 flex items-center border"
              >
                {content}
              </div>
            )
          })
        ) : (
          <p className="body-3 text-muted-foreground">{empty}</p>
        )}
      </div>
    </section>
  )
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value : ''
}
