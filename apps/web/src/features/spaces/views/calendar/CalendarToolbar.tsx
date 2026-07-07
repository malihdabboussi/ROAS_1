'use client'

import { useEffect, useRef, useState } from 'react'
import {
  CalendarDays,
  Check,
  ChevronDown,
  Clock,
  Instagram,
  Linkedin,
  List,
  ListTodo,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Tooltip } from '@/components/ui/tooltip'
import {
  connectCalendarIntegration,
  type CalendarProvider,
} from '@/lib/services/calendar-api'
import { SaveViewSlot } from '../_shared/SaveViewSeparator'
import { SpaceQuickFilterDock } from '../_shared/SpaceQuickFilterDock'
import { ToolbarShell } from '../_shared/ToolbarShell'
import { SpaceCustomizeButton } from '../../components/toolbar'
import { SPACES_CALENDAR_TOAST_ERRORS } from '../../config/spaces-toast-errors.config'
import type {
  CalendarConfig,
  CalendarSocialPlatform,
  CalendarTimeFormat,
} from '../../types/space-schema'
import type { SpaceToolbarContext } from '../types'
import {
  isCalendarSourceVisible,
  normalizeCalendarSources,
  patchCalendarSourceVisibility,
  SPACE_CALENDAR_SOURCE_IDS,
  SPACE_CALENDAR_SOURCE_LABELS,
  type SpaceCalendarSourceId,
} from './calendar-source-utils'
function resolveCalendarConfig(ctx: SpaceToolbarContext): CalendarConfig {
  return ctx.activeView?.calendar_config ?? {}
}
function patchCalendarConfig(ctx: SpaceToolbarContext, patch: Partial<CalendarConfig>) {
  const current = resolveCalendarConfig(ctx)
  void ctx.handleViewPatch({
    calendar_config: {
      ...current,
      ...patch,
    },
  })
}
const PLATFORM_OPTIONS: { id: CalendarSocialPlatform; label: string }[] = [
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'instagram', label: 'Instagram' },
]
function platformSummaryLabel(filters: CalendarSocialPlatform[]): string {
  if (filters.length === 0) return 'All platforms'
  if (filters.length === 2) return 'LinkedIn · Instagram'
  return filters[0] === 'linkedin' ? 'LinkedIn' : 'Instagram'
}
function PlatformGlyph({ id }: { id: CalendarSocialPlatform }) {
  if (id === 'linkedin') {
    return <Linkedin className="text-muted-foreground h-2.5 w-2.5" aria-hidden />
  }
  return <Instagram className="text-muted-foreground h-2.5 w-2.5" aria-hidden />
}
function PlatformIconStack({ ids }: { ids: CalendarSocialPlatform[] }) {
  const ordered = PLATFORM_OPTIONS.filter((o) => ids.includes(o.id))
  return (
    <span className="flex shrink-0 -space-x-1.5">
      {ordered.map((o) => (
        <span
          key={o.id}
          className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-secondary)] ring-1 ring-[var(--background)]"
        >
          <PlatformGlyph id={o.id} />
        </span>
      ))}
    </span>
  )
}
function SourceGlyph({ id }: { id: SpaceCalendarSourceId }) {
  if (id === 'space_items') return <ListTodo className="icon-sm text-muted-foreground" />
  return <CalendarDays className="icon-sm text-muted-foreground" />
}
function isProviderSource(id: SpaceCalendarSourceId): id is CalendarProvider {
  return id === 'google_calendar' || id === 'outlook'
}
export function CalendarToolbar({ ctx }: { ctx: SpaceToolbarContext }) {
  const [sourceOpen, setSourceOpen] = useState(false)
  const [platformOpen, setPlatformOpen] = useState(false)
  const [timeFormatOpen, setTimeFormatOpen] = useState(false)
  const [connectingProvider, setConnectingProvider] = useState<CalendarProvider | null>(null)
  const sourceRootRef = useRef<HTMLDivElement | null>(null)
  const platformRootRef = useRef<HTMLDivElement | null>(null)
  const timeFormatRootRef = useRef<HTMLDivElement | null>(null)
  const config = resolveCalendarConfig(ctx)
  const sourceConfigs = normalizeCalendarSources(config)
  const showTaskList = config.show_task_list ?? true
  const timeFormat: CalendarTimeFormat = config.time_format ?? '12h'
  const platformFilters = config.social_platform_filters ?? []
  const hasCampaign = Boolean(ctx.activeSpace.campaign_id)
  const tasksVisible = isCalendarSourceVisible(config, 'space_items')
  const socialVisible = hasCampaign && isCalendarSourceVisible(config, 'campaign_social_posts')
  const visibleSourceCount = sourceConfigs.filter((source) => {
    if (source.id === 'campaign_social_posts' && !hasCampaign) return false
    return source.visible
  }).length
  useEffect(() => {
    if (!sourceOpen) return
    const onDocPointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (sourceRootRef.current?.contains(target)) return
      setSourceOpen(false)
    }
    document.addEventListener('mousedown', onDocPointerDown)
    return () => document.removeEventListener('mousedown', onDocPointerDown)
  }, [sourceOpen])
  useEffect(() => {
    if (!timeFormatOpen) return
    const onDocPointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (timeFormatRootRef.current?.contains(target)) return
      setTimeFormatOpen(false)
    }
    document.addEventListener('mousedown', onDocPointerDown)
    return () => document.removeEventListener('mousedown', onDocPointerDown)
  }, [timeFormatOpen])

  const setSourceVisible = (sourceId: SpaceCalendarSourceId, visible: boolean) => {
    patchCalendarConfig(ctx, patchCalendarSourceVisibility(config, sourceId, visible))
  }

  const handleConnectProvider = async (provider: CalendarProvider) => {
    setConnectingProvider(provider)
    try {
      await connectCalendarIntegration(provider)
    } catch {
      toast.error(SPACES_CALENDAR_TOAST_ERRORS.CONNECT_CALENDAR_FAILED.userMessage)
    } finally {
      setConnectingProvider(null)
    }
  }

  const setTimeFormat = (next: CalendarTimeFormat) => {
    patchCalendarConfig(ctx, { time_format: next })
    setTimeFormatOpen(false)
  }

  useEffect(() => {
    if (!platformOpen) return
    const onDocPointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (platformRootRef.current?.contains(target)) return
      setPlatformOpen(false)
    }
    document.addEventListener('mousedown', onDocPointerDown)
    return () => document.removeEventListener('mousedown', onDocPointerDown)
  }, [platformOpen])

  const togglePlatformFilter = (id: CalendarSocialPlatform) => {
    const has = platformFilters.includes(id)
    const next = has ? platformFilters.filter((p) => p !== id) : [...platformFilters, id]
    patchCalendarConfig(ctx, { social_platform_filters: next })
  }

  const sourceLabel = visibleSourceCount === 1 ? '1 source' : `${visibleSourceCount} sources`
  const hasPlatformFilter = platformFilters.length > 0

  return (
    <ToolbarShell ctx={ctx}>
      <div className="flex min-w-0 flex-nowrap items-center gap-1">
        <div ref={sourceRootRef} className="relative">
          <button
            type="button"
            onClick={() => setSourceOpen((open) => !open)}
            className="badge-glass badge-glass-purple rounded-spacing-2 body-3 px-spacing-2 py-spacing-1 text-foreground inline-flex items-center gap-1.5 font-medium transition-opacity hover:opacity-90"
          >
            <CalendarDays className="icon-sm" />
            <span>{sourceLabel}</span>
            <ChevronDown className="icon-xs text-muted-foreground" />
          </button>
          {sourceOpen ? (
            <div className="dropdown-menu-solid z-dropdown mt-spacing-1 py-spacing-1 absolute left-0 top-full w-spacing-60 overflow-hidden rounded-xl shadow-lg">
              <p className="px-spacing-3 py-spacing-1 typo-section-label text-muted-foreground">
                Sources
              </p>
              <div className="px-spacing-1 flex flex-col gap-px">
                {SPACE_CALENDAR_SOURCE_IDS.map((sourceId) => {
                  const visible = isCalendarSourceVisible(config, sourceId)
                  const disabled = sourceId === 'campaign_social_posts' && !hasCampaign
                  return (
                    <div
                      key={sourceId}
                      className="hover:bg-hover-subtle rounded-md transition-colors"
                    >
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => setSourceVisible(sourceId, !visible)}
                        className="gap-spacing-2 px-spacing-2 py-spacing-1 body-3 text-foreground flex w-full items-center text-left disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <SourceGlyph id={sourceId} />
                        <span className="flex-1 truncate">
                          {SPACE_CALENDAR_SOURCE_LABELS[sourceId]}
                        </span>
                        {visible && !disabled ? (
                          <Check className="icon-sm text-muted-foreground shrink-0" />
                        ) : null}
                      </button>
                      {isProviderSource(sourceId) ? (
                        <div className="px-spacing-2 pb-spacing-1 pl-spacing-8">
                          <button
                            type="button"
                            onClick={() => void handleConnectProvider(sourceId)}
                            disabled={connectingProvider === sourceId}
                            className="typo-caption text-muted-foreground hover:text-foreground transition-colors disabled:cursor-wait disabled:opacity-60"
                          >
                            Connect
                          </button>
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </div>
          ) : null}
        </div>
        <Tooltip
          label={showTaskList ? 'Hide selected day list' : 'Show selected day list'}
          side="bottom"
        >
          <button
            type="button"
            onClick={() => patchCalendarConfig(ctx, { show_task_list: !showTaskList })}
            className={`rounded-md p-1.5 transition-colors ${
              showTaskList
                ? 'text-foreground hover:bg-hover-subtle'
                : 'text-muted-foreground hover:bg-hover-subtle hover:text-foreground'
            }`}
            aria-pressed={showTaskList}
          >
            <List className="h-3.5 w-3.5" />
          </button>
        </Tooltip>
        <div ref={timeFormatRootRef} className="relative">
          <Tooltip label="Time format" side="bottom">
            <button
              type="button"
              onClick={() => setTimeFormatOpen((open) => !open)}
              className="text-muted-foreground hover:bg-hover-subtle hover:text-foreground rounded-md p-1.5 transition-colors"
              aria-haspopup="menu"
              aria-expanded={timeFormatOpen}
            >
              <span className="inline-flex items-center gap-0.5">
                <Clock className="h-3.5 w-3.5" />
                <ChevronDown className="h-3 w-3" />
              </span>
            </button>
          </Tooltip>
          {timeFormatOpen ? (
            <div className="dropdown-menu-solid z-dropdown mt-spacing-1 py-spacing-1 absolute left-0 top-full w-[160px] overflow-hidden rounded-xl shadow-lg">
              <p className="px-spacing-3 py-spacing-1 typo-section-label text-muted-foreground">
                Time format
              </p>
              <div className="px-spacing-1 flex flex-col gap-px">
                {(['12h', '24h'] as const).map((option) => {
                  const selected = timeFormat === option
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setTimeFormat(option)}
                      className="gap-spacing-2 px-spacing-2 py-spacing-1 body-3 text-foreground hover:bg-hover-subtle flex w-full items-center justify-between rounded-md text-left transition-colors"
                    >
                      <span className="flex-1 truncate font-medium">
                        {option === '12h' ? 'AM/PM' : '24h'}
                      </span>
                      {selected ? (
                        <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                      ) : null}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
        <SaveViewSlot ctx={ctx} />
        {tasksVisible ? (
          <SpaceQuickFilterDock ctx={ctx} />
        ) : null}
        {socialVisible ? (
          <>
            <div
              ref={platformRootRef}
              className="relative flex h-7 shrink-0 items-center justify-center"
              title={hasPlatformFilter ? platformSummaryLabel(platformFilters) : undefined}
            >
              {hasPlatformFilter ? (
                <div className="badge-glass badge-glass-blue rounded-spacing-2 px-spacing-2 py-spacing-1 inline-flex items-center gap-1.5">
                  <PlatformIconStack ids={platformFilters} />
                  <div className="border-border/50 flex shrink-0 flex-col items-center justify-center gap-px border-l pl-1">
                    <button
                      type="button"
                      aria-label="Platform filter options"
                      onClick={() => setPlatformOpen((open) => !open)}
                      className="text-muted-foreground hover:bg-hover-subtle hover:text-foreground flex h-3.5 w-3.5 items-center justify-center rounded transition-colors"
                    >
                      <ChevronDown className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      aria-label="Clear platform filters"
                      onClick={() => patchCalendarConfig(ctx, { social_platform_filters: [] })}
                      className="text-muted-foreground hover:bg-hover-subtle hover:text-foreground flex h-3.5 w-3.5 items-center justify-center rounded transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ) : (
                <Tooltip
                  label="Filter by platform"
                  side="bottom"
                  triggerClassName="flex h-full items-center"
                >
                  <span className="inline-flex">
                    <button
                      type="button"
                      onClick={() => setPlatformOpen((open) => !open)}
                      className="text-muted-foreground hover:bg-hover-subtle hover:text-foreground rounded-md p-1.5 transition-colors"
                    >
                      <span className="inline-flex items-center gap-0.5">
                        <CalendarDays className="h-3.5 w-3.5" />
                        <ChevronDown className="h-3 w-3" />
                      </span>
                    </button>
                  </span>
                </Tooltip>
              )}
              {platformOpen ? (
                <div className="dropdown-menu-solid z-dropdown mt-spacing-1 py-spacing-1 absolute right-0 top-full w-[224px] overflow-hidden rounded-xl shadow-lg">
                  <p className="px-spacing-3 py-spacing-1 typo-section-label text-muted-foreground">
                    Platform
                  </p>
                  <div className="px-spacing-1 flex flex-col gap-px">
                    <button
                      type="button"
                      onClick={() => patchCalendarConfig(ctx, { social_platform_filters: [] })}
                      className="gap-spacing-2 px-spacing-2 py-spacing-1 body-3 text-foreground hover:bg-hover-subtle flex w-full items-center justify-between rounded-md text-left transition-colors"
                    >
                      <span className="flex-1 truncate font-medium">All platforms</span>
                      {platformFilters.length === 0 ? (
                        <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                      ) : null}
                    </button>
                    {PLATFORM_OPTIONS.map((option) => {
                      const isSelected = platformFilters.includes(option.id)
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => togglePlatformFilter(option.id)}
                          className="gap-spacing-2 px-spacing-2 py-spacing-1 body-3 text-foreground hover:bg-hover-subtle flex w-full items-center justify-between rounded-md text-left transition-colors"
                        >
                          <span className="flex-1 truncate font-medium">{option.label}</span>
                          {isSelected ? (
                            <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                          ) : null}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : null}
            </div>
            <div className="border-l-glass mx-1 h-4 w-0 shrink-0 self-center" aria-hidden />
          </>
        ) : null}
        <SpaceCustomizeButton
          schemaEditorOpen={ctx.schemaEditorOpen}
          closeCustomizePanel={ctx.closeCustomizePanel}
          openCustomizeFromToolbar={ctx.openCustomizeFromToolbar}
        />
      </div>
    </ToolbarShell>
  )
}
