'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { MonthCalendar } from '@/components/calendar/MonthCalendar'
import { TimePicker } from '@/components/datetime/TimePicker'
import type { ValidationResult } from '../../../lib/social-post-validation'
import type { ScheduledSocialPost } from '../../../services/artifact-preview.service'
import { SOCIAL_POST_PLATFORM_LOGO_SRC } from './social-post-preview.constants'

interface SocialPostScheduleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  isReschedule: boolean
  postTitle: string
  validation: ValidationResult
  scheduleMode: 'time' | 'next'
  onScheduleModeChange: (mode: 'time' | 'next') => void
  scheduleValue: string
  selectedScheduleDate: Date | null
  scheduleMonth: Date
  scheduledOnSelectedDay: ScheduledSocialPost[]
  nextSlot: Date
  scheduleWorking: boolean
  onDateButtonClick: () => void
  onPrevMonth: () => void
  onNextMonth: () => void
  onSelectDate: (day: Date) => void
  onJumpToday: () => void
  onTimeChange: (nextTime: string | null) => void
  onConfirm: () => void
}

function formatScheduleTime(value: string): string | null {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return `${String(parsed.getHours()).padStart(2, '0')}:${String(parsed.getMinutes()).padStart(2, '0')}`
}

function scheduledPostTitle(row: ScheduledSocialPost): string {
  return row.caption?.trim() || row.headline?.trim() || 'Untitled post'
}

export function SocialPostScheduleDialog({
  open,
  onOpenChange,
  isReschedule,
  postTitle,
  validation,
  scheduleMode,
  onScheduleModeChange,
  scheduleValue,
  selectedScheduleDate,
  scheduleMonth,
  scheduledOnSelectedDay,
  nextSlot,
  scheduleWorking,
  onDateButtonClick,
  onPrevMonth,
  onNextMonth,
  onSelectDate,
  onJumpToday,
  onTimeChange,
  onConfirm,
}: SocialPostScheduleDialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="z-modal-backdrop fixed inset-0" />
        <DialogPrimitive.Content className="z-modal-content p-spacing-4 fixed inset-0 flex items-center justify-center">
          <div className="surface-card wizard-container-border rounded-spacing-4 w-full max-w-xl">
            <div className="px-spacing-6 pt-spacing-4 pb-spacing-2">
              <div className="flex items-center justify-between">
                <DialogPrimitive.Title className="title-h6">
                  {isReschedule ? 'Reschedule Post' : 'Schedule Post'}
                </DialogPrimitive.Title>
                <button
                  type="button"
                  aria-label="Close schedule"
                  onClick={() => onOpenChange(false)}
                  className="btn-icon-bare"
                >
                  <X className="icon-xs" />
                </button>
              </div>
              <DialogPrimitive.Description className="body-3 text-muted-foreground mt-spacing-1 truncate">
                {postTitle}
              </DialogPrimitive.Description>
            </div>

            <div className="px-spacing-6 py-spacing-4 gap-spacing-3 flex flex-col">
              {(validation.errors.length > 0 || validation.warnings.length > 0) && (
                <div className="rounded-spacing-2 border-border border px-3 py-2">
                  {validation.errors.length > 0 && (
                    <div className="mb-2">
                      <div className="text-destructive body-4 font-semibold">
                        Fix before scheduling
                      </div>
                      {validation.errors.map((issue, idx) => (
                        <div key={`${issue.field}-${idx}`} className="text-destructive/80 body-4">
                          - {issue.message}
                        </div>
                      ))}
                    </div>
                  )}
                  {validation.warnings.length > 0 && (
                    <div>
                      <div className="body-4 text-muted-foreground font-semibold">Warnings</div>
                      {validation.warnings.map((issue, idx) => (
                        <div
                          key={`${issue.field}-w-${idx}`}
                          className="body-4 text-muted-foreground"
                        >
                          - {issue.message}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onScheduleModeChange('time')}
                  className={`rounded-spacing-2 flex-1 px-3 py-2 text-sm font-medium transition-colors ${scheduleMode === 'time' ? 'chip-glass-blue' : 'border-border text-muted-foreground hover:bg-hover-subtle border'}`}
                >
                  Pick date & time
                </button>
                <button
                  type="button"
                  onClick={() => onScheduleModeChange('next')}
                  className={`rounded-spacing-2 flex-1 px-3 py-2 text-sm font-medium transition-colors ${scheduleMode === 'next' ? 'chip-glass-blue' : 'border-border text-muted-foreground hover:bg-hover-subtle border'}`}
                >
                  Next available
                </button>
              </div>

              {scheduleMode === 'time' ? (
                <div className="gap-spacing-2 flex flex-col">
                  <div className="gap-spacing-2 flex items-stretch">
                    <button
                      type="button"
                      onClick={onDateButtonClick}
                      className="h-spacing-10 px-spacing-3 body-2 rounded-spacing-2 border-border surface-bg text-foreground min-w-0 flex-1 truncate border text-left"
                    >
                      {selectedScheduleDate
                        ? selectedScheduleDate.toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })
                        : 'Pick date'}
                    </button>
                    <TimePicker
                      value={formatScheduleTime(scheduleValue)}
                      onChange={onTimeChange}
                      align="end"
                      hideClear
                    />
                  </div>
                  <div className="border-border rounded-spacing-3 grid min-h-[288px] grid-cols-[minmax(0,1fr)_190px] overflow-hidden border">
                    <MonthCalendar
                      month={scheduleMonth}
                      startDate={selectedScheduleDate}
                      endDate={null}
                      activeField="due"
                      recurrence={null}
                      onPrevMonth={onPrevMonth}
                      onNextMonth={onNextMonth}
                      onSelectDate={onSelectDate}
                      onJumpToday={onJumpToday}
                    />
                    <div className="border-border surface-bg gap-spacing-3 p-spacing-3 flex flex-col border-l">
                      <div>
                        <div className="typo-caption text-muted-foreground mb-spacing-2 font-medium uppercase tracking-wider">
                          Scheduled this day
                        </div>
                        <div className="gap-spacing-1 flex max-h-[240px] flex-col overflow-y-auto">
                          {scheduledOnSelectedDay.length === 0 ? (
                            <div className="typo-caption text-muted-foreground rounded-spacing-2 border-border px-spacing-2 py-spacing-2 border">
                              No posts scheduled
                            </div>
                          ) : (
                            scheduledOnSelectedDay.map((row) => (
                              <div
                                key={row.id}
                                className="hover:bg-hover-subtle rounded-spacing-2 gap-spacing-2 px-spacing-2 py-spacing-1-5 flex min-w-0 items-center"
                              >
                                <img
                                  src={SOCIAL_POST_PLATFORM_LOGO_SRC[row.platform]}
                                  alt=""
                                  className="h-4 w-4 shrink-0 rounded"
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="body-4 text-foreground truncate">
                                    {scheduledPostTitle(row)}
                                  </div>
                                  <div className="typo-caption text-muted-foreground">
                                    {row.scheduled_at
                                      ? new Date(row.scheduled_at).toLocaleTimeString('en-US', {
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })
                                      : null}
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="chip-glass-blue rounded-spacing-2 px-3 py-3">
                  <div className="body-3">Next available slot</div>
                  <div className="body-2 text-foreground mt-1 font-medium">
                    {nextSlot.toLocaleString('en-US', {
                      weekday: 'long',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="px-spacing-6 py-spacing-4 border-border flex items-center justify-between border-t">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="button-glass-neutral hover:bg-hover-subtle hover:text-foreground rounded-lg px-4 py-2 text-sm font-medium transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={
                  scheduleWorking ||
                  validation.errors.length > 0 ||
                  (scheduleMode === 'time' && !scheduleValue)
                }
                className="button-glass-accent rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                <span className="relative z-10">{scheduleWorking ? 'Scheduling…' : 'Confirm'}</span>
              </button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
