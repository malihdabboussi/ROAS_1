'use client'

import {
  CalendarClock,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LayoutList,
  Video,
} from 'lucide-react'
import { AgendaCardCoverageMenu } from '@/features/home/components/AgendaCardCoverageMenu'
import { AgendaEmptyIllustration } from '@/features/home/components/AgendaEmptyIllustration'
import { startOfAgendaWeek } from '@/features/home/lib/agenda-fetch-window'
import { getIntegrationLogoPath } from '@/lib/integrations/integration-logo'
import type { TeamAgendaCoverage } from '@/lib/services/calendar-api'

type AgendaView = 'list' | 'board'
type ProviderFilter = 'all' | 'google_calendar' | 'outlook'
type DateRange = 'day' | 'week' | 'month'

const CALENDAR_PROVIDER_CONNECT: {
  integrationId: 'google_calendar' | 'outlook'
  label: string
}[] = [
  { integrationId: 'google_calendar', label: 'Connect Google Calendar' },
  { integrationId: 'outlook', label: 'Connect Microsoft Outlook' },
]

export function formatAgendaNavDate(d: Date, range: DateRange): string {
  if (range === 'day')
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  if (range === 'week') {
    const start = startOfAgendaWeek(d)
    const end = new Date(start)
    end.setDate(end.getDate() + 6)
    const sameMonth = start.getMonth() === end.getMonth()
    if (sameMonth)
      return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.getDate()}`
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
  }
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export function stepAgendaDate(d: Date, range: DateRange, direction: 1 | -1): Date {
  if (range === 'day') return new Date(d.getTime() + direction * 86400000)
  if (range === 'week') return new Date(d.getTime() + direction * 7 * 86400000)
  const m = new Date(d)
  m.setMonth(m.getMonth() + direction)
  return m
}

export function agendaRangeDetail(d: Date, r: DateRange): string {
  return formatAgendaNavDate(d, r)
}

export function AgendaCardHeader(props: {
  showAgendaSurface: boolean
  hideTitle?: boolean
  bothConnected: boolean
  provider: ProviderFilter
  setProvider: (p: ProviderFilter) => void
  agendaScope: 'personal' | 'team'
  setAgendaScope: (s: 'personal' | 'team') => void
  showTeamToggle: boolean
  view: AgendaView
  setView: (v: AgendaView) => void
  teamCoverage: TeamAgendaCoverage | null
  onStartInstantMeeting: () => void
}) {
  const {
    showAgendaSurface,
    hideTitle = false,
    bothConnected,
    provider,
    setProvider,
    agendaScope,
    setAgendaScope,
    showTeamToggle,
    view,
    setView,
    teamCoverage,
    onStartInstantMeeting,
  } = props

  return (
    <div className="agenda-card-header">
      {hideTitle ? (
        <span className="sr-only">Agenda</span>
      ) : (
        <div className="flex items-center gap-2">
          <CalendarClock className="text-icon h-4 w-4 shrink-0" />
          <span className="agenda-card-title">Agenda</span>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-end gap-1">
        <button
          type="button"
          onClick={onStartInstantMeeting}
          className="button-compact button-glass-primary gap-spacing-1 inline-flex items-center"
          aria-label="Start impromptu call"
        >
          <Video className="icon-xs" aria-hidden />
          <span className="hidden sm:inline">New call</span>
        </button>
        {showAgendaSurface ? (
          <>
            {showTeamToggle ? (
              <div className="bg-secondary rounded-spacing-2 p-spacing-0-5 mr-spacing-1 flex">
                {(['personal', 'team'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setAgendaScope(s)}
                    className={`button-compact ${
                      agendaScope === s
                        ? 'nav-glass-selected-purple text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {s === 'personal' ? 'Mine' : 'Team'}
                  </button>
                ))}
              </div>
            ) : null}
            <AgendaCardCoverageMenu
              coverage={teamCoverage}
              visible={showTeamToggle && agendaScope === 'team'}
            />
            {bothConnected && agendaScope === 'personal' && (
              <div className="bg-secondary rounded-spacing-2 p-spacing-0-5 mr-spacing-1 flex">
                {(['all', 'google_calendar', 'outlook'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setProvider(p)}
                    className={`button-compact ${
                      provider === p
                        ? 'nav-glass-selected-purple text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {p === 'all' ? 'All' : p === 'google_calendar' ? 'Google' : 'Outlook'}
                  </button>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => setView('list')}
              className={`btn-icon-glass ${view === 'list' ? 'btn-icon-glass--active' : 'text-muted-foreground hover:text-foreground'}`}
              aria-label="List view"
            >
              <LayoutList className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setView('board')}
              className={`btn-icon-glass ${view === 'board' ? 'btn-icon-glass--active' : 'text-muted-foreground hover:text-foreground'}`}
              aria-label="Calendar views"
            >
              <CalendarDays className="h-4 w-4" />
            </button>
          </>
        ) : null}
      </div>
    </div>
  )
}

export function AgendaCardRangeNav(props: {
  day: Date
  range: DateRange
  rangeOpen: boolean
  setRangeOpen: (v: boolean | ((prev: boolean) => boolean)) => void
  setDay: (updater: (d: Date) => Date) => void
  setRange: (r: DateRange) => void
}) {
  const { day, range, rangeOpen, setRangeOpen, setDay, setRange } = props
  return (
    <div className="border-border flex items-center justify-between gap-2 border-b px-4 py-2 sm:px-5">
      <button
        type="button"
        className="btn-icon-bare-sm"
        aria-label={`Previous ${range}`}
        onClick={() => setDay((d) => stepAgendaDate(d, range, -1))}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <div className="relative" data-range-dropdown>
        <button
          type="button"
          className="button-compact text-foreground hover:bg-hover-subtle"
          onClick={() => setRangeOpen((v) => !v)}
        >
          {formatAgendaNavDate(day, range)}
          <ChevronDown className="text-muted-foreground h-3 w-3" />
        </button>
        {rangeOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setRangeOpen(false)} />
            <div className="dropdown-menu-solid w-spacing-48 py-spacing-1 mt-spacing-1 absolute left-1/2 top-full -translate-x-1/2">
              {(['day', 'week', 'month'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  className={`body-3 hover:bg-hover-subtle flex w-full items-center justify-between gap-4 px-3 py-2 text-left transition-colors ${
                    range === r ? 'text-foreground font-semibold' : 'text-foreground'
                  }`}
                  onClick={() => {
                    setRange(r)
                    setRangeOpen(false)
                  }}
                >
                  <span className="capitalize">{r}</span>
                  <span className="typo-caption text-muted-foreground">
                    {agendaRangeDetail(day, r)}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      <button
        type="button"
        className="btn-icon-bare-sm"
        aria-label={`Next ${range}`}
        onClick={() => setDay((d) => stepAgendaDate(d, range, 1))}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}

export function AgendaCardDisconnected(props: {
  openCalendarIntegration: (id: 'google_calendar' | 'outlook') => void
  agendaScope?: 'personal' | 'team'
  openWorkspaceIntegration?: () => void
}) {
  const isTeam = props.agendaScope === 'team'
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 px-4 py-8 sm:px-6">
      <AgendaEmptyIllustration />
      <div className="max-w-md text-center">
        <p className="body-3 text-foreground font-semibold">
          {isTeam ? 'Team calendar not connected yet' : 'Calendar not connected yet'}
        </p>
        <p className="body-3 text-muted-foreground mt-spacing-2 leading-relaxed">
          {isTeam
            ? 'Connect Google Workspace in Integrations so Pixel can show teammate agendas with the same Fathom and prep context.'
            : 'Tap a provider to open its integration and connect.'}
        </p>
      </div>
      {isTeam ? (
        <button
          type="button"
          onClick={() => props.openWorkspaceIntegration?.()}
          className="button-glass-secondary rounded-spacing-2 body-3 px-spacing-4 py-spacing-2"
        >
          Open Google Workspace
        </button>
      ) : (
        <div className="gap-spacing-3 flex flex-wrap items-center justify-center">
          {CALENDAR_PROVIDER_CONNECT.map(({ integrationId, label }) => {
            const src = getIntegrationLogoPath(integrationId)
            return (
              <button
                key={integrationId}
                type="button"
                onClick={() => props.openCalendarIntegration(integrationId)}
                className="surface-card rounded-spacing-2 border-border p-spacing-1-5 relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden border transition-opacity hover:opacity-90"
                aria-label={label}
              >
                {src ? (
                  <img src={src} alt="" className="block h-7 w-7 object-contain object-center" />
                ) : (
                  <span className="typo-caption text-muted-foreground font-medium">
                    {(integrationId === 'google_calendar' ? 'Google Calendar' : 'Microsoft Outlook')
                      .slice(0, 2)
                      .toUpperCase()}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
