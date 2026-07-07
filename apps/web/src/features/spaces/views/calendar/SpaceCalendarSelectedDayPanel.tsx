'use client'

import type { ReactNode } from 'react'
import { CalendarClock, CalendarX, ExternalLink, Share2, Video } from 'lucide-react'
import type { CalendarEvent } from '@/components/calendar'
import { Tooltip } from '@/components/ui/tooltip'
import { SchedulePostThumbnail } from '@/features/studio/components/preview/schedule/schedule-thumbnail'
import type { ScheduledSocialPost } from '@/features/studio/services/artifact-preview.service'
import type { CalendarAgendaEvent } from '@/lib/services/calendar-api'
import { SpaceCalendarQuickTaskComposer } from './SpaceCalendarQuickTaskComposer'

type SpaceCalendarSelectedDayPanelProps = {
  day: Date
  selectedEvents: CalendarEvent[]
  dateField: string
  readOnly: boolean
  showTasks: boolean
  showSocial: boolean
  showExternal: boolean
  taskList: ReactNode
  onCreateItem?: (title: string, extra: Record<string, unknown>) => Promise<unknown>
  onOpenSocialPost?: (postId: string, title: string) => void
  onRescheduleSocialPost: (post: ScheduledSocialPost) => void
  onUnscheduleSocialPost: (post: ScheduledSocialPost) => void
}

function socialPostHasDesign(row: ScheduledSocialPost): boolean {
  if (row.image_url) return true
  if (row.generated_tsx?.trim()) return true
  if (row.carousel_slides?.length) {
    return row.carousel_slides.some(
      (slide) => Boolean(slide?.image_url) || Boolean(slide?.tsx?.trim?.()),
    )
  }
  return false
}

function timeLabel(event: CalendarEvent, raw?: CalendarAgendaEvent): string {
  if (raw?.all_day) return 'All day'
  return new Date(event.start).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function providerLabel(sourceId: string): string {
  if (sourceId === 'google_calendar') return 'Google Calendar'
  if (sourceId === 'outlook') return 'Outlook'
  return 'Calendar'
}

export function SpaceCalendarSelectedDayPanel({
  day,
  selectedEvents,
  dateField,
  readOnly,
  showTasks,
  showSocial,
  showExternal,
  taskList,
  onCreateItem,
  onOpenSocialPost,
  onRescheduleSocialPost,
  onUnscheduleSocialPost,
}: SpaceCalendarSelectedDayPanelProps) {
  const rows = selectedEvents.filter((event) => {
    if (event.sourceId === 'space_items') return false
    if (event.sourceId === 'campaign_social_posts') return showSocial
    return showExternal
  })

  return (
    <div className="gap-spacing-2 flex min-h-0 flex-col">
      {showTasks && !readOnly ? (
        <SpaceCalendarQuickTaskComposer
          day={day}
          dateField={dateField}
          disabled={readOnly}
          onCreateItem={onCreateItem}
        />
      ) : null}
      {showTasks ? taskList : null}
      {rows.length > 0 || !showTasks ? (
        <div className="border-border overflow-auto rounded-lg border">
          <div className="body-3 text-muted-foreground border-border flex items-center justify-between border-b px-spacing-3 py-spacing-2">
            <span>Selected day</span>
            <span className="typo-caption">Calendar items</span>
          </div>
          {rows.length === 0 ? (
            <div className="body-3 text-muted-foreground px-spacing-3 py-spacing-6">
              No calendar items
            </div>
          ) : (
            <div className="divide-border divide-y">
              {rows.map((event) => {
                const isSocial = event.sourceId === 'campaign_social_posts'
                const post = isSocial ? (event.raw as ScheduledSocialPost) : null
                const providerEvent = !isSocial ? (event.raw as CalendarAgendaEvent) : null
                const hasDesign = post ? socialPostHasDesign(post) : false
                return (
                  <div
                    key={event.id}
                    className="group/social-row hover:bg-hover-subtle relative flex w-full items-center gap-spacing-3 px-spacing-3 py-spacing-2 text-left"
                  >
                    {isSocial && post ? (
                      hasDesign ? (
                        <div className="h-7 w-7 shrink-0 overflow-hidden rounded-md">
                          <SchedulePostThumbnail row={post} size="md" />
                        </div>
                      ) : (
                        <div className="surface-bg flex h-7 w-7 shrink-0 items-center justify-center rounded-md">
                          <Share2 className="icon-sm text-muted-foreground" />
                        </div>
                      )
                    ) : (
                      <div className="surface-bg flex h-7 w-7 shrink-0 items-center justify-center rounded-md">
                        <Video className="icon-sm text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="body-4 text-foreground truncate">{event.title}</div>
                      <div className="typo-caption text-muted-foreground truncate">
                        {isSocial ? event.subtitle : providerLabel(event.sourceId)}
                      </div>
                    </div>
                    <div className="typo-caption text-muted-foreground whitespace-nowrap transition-all duration-150 group-hover/social-row:translate-x-1 group-hover/social-row:opacity-0">
                      {timeLabel(event, providerEvent ?? undefined)}
                    </div>
                    {isSocial && post ? (
                      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 translate-x-2 opacity-0 transition-all duration-150 group-hover/social-row:pointer-events-auto group-hover/social-row:translate-x-0 group-hover/social-row:opacity-100">
                        <div className="flex items-center gap-spacing-1">
                          <Tooltip label="Reschedule" side="top">
                            <button
                              type="button"
                              onClick={(eventClick) => {
                                eventClick.stopPropagation()
                                onRescheduleSocialPost(post)
                              }}
                              className="text-muted-foreground hover:text-foreground hover:bg-hover-subtle inline-flex h-6 w-6 items-center justify-center rounded transition-colors"
                              aria-label="Reschedule post"
                            >
                              <CalendarClock className="icon-xs" />
                            </button>
                          </Tooltip>
                          <Tooltip label="Remove schedule" side="top">
                            <button
                              type="button"
                              onClick={(eventClick) => {
                                eventClick.stopPropagation()
                                onUnscheduleSocialPost(post)
                              }}
                              className="text-muted-foreground hover:text-foreground hover:bg-hover-subtle inline-flex h-6 w-6 items-center justify-center rounded transition-colors"
                              aria-label="Remove from schedule"
                            >
                              <CalendarX className="icon-xs" />
                            </button>
                          </Tooltip>
                          {onOpenSocialPost ? (
                            <Tooltip label="Open post" side="top">
                              <button
                                type="button"
                                onClick={(eventClick) => {
                                  eventClick.stopPropagation()
                                  onOpenSocialPost(post.id, event.title)
                                }}
                                className="text-muted-foreground hover:text-foreground hover:bg-hover-subtle inline-flex h-6 w-6 items-center justify-center rounded transition-colors"
                                aria-label="Open post in full preview"
                              >
                                <ExternalLink className="icon-xs" />
                              </button>
                            </Tooltip>
                          ) : null}
                        </div>
                      </div>
                    ) : providerEvent ? (
                      <div className="flex items-center gap-spacing-1">
                        {providerEvent.video_url ? (
                          <Tooltip label="Open meeting" side="top">
                            <a
                              href={providerEvent.video_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-muted-foreground hover:text-foreground hover:bg-hover-subtle inline-flex h-6 w-6 items-center justify-center rounded transition-colors"
                              aria-label="Open meeting"
                            >
                              <Video className="icon-xs" />
                            </a>
                          </Tooltip>
                        ) : null}
                        {providerEvent.html_link ? (
                          <Tooltip label="Open event" side="top">
                            <a
                              href={providerEvent.html_link}
                              target="_blank"
                              rel="noreferrer"
                              className="text-muted-foreground hover:text-foreground hover:bg-hover-subtle inline-flex h-6 w-6 items-center justify-center rounded transition-colors"
                              aria-label="Open event"
                            >
                              <ExternalLink className="icon-xs" />
                            </a>
                          </Tooltip>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
