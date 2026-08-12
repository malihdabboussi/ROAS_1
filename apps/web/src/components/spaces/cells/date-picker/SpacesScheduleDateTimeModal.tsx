'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { TimePicker } from '@/components/datetime/TimePicker'
import {
  formatSpacesScheduleTime,
  nextSpacesScheduleDefault,
  parseLocalSpacesScheduleValue,
  toLocalSpacesScheduleValue,
  toStartOfSpacesScheduleMonth,
} from '@/features/spaces/lib/spaces-schedule-datetime'
import { MonthCalendar } from './MonthCalendar'

export interface SpacesScheduleDateTimeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  subtitle?: string | null
  value: string
  onChange: (value: string) => void
  onConfirm: () => void
  confirmLabel?: string
  cancelLabel?: string
  working?: boolean
  confirmDisabled?: boolean
  sidePanel?: ReactNode
}

export function SpacesScheduleDateTimeModal({
  open,
  onOpenChange,
  title,
  subtitle,
  value,
  onChange,
  onConfirm,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  working = false,
  confirmDisabled = false,
  sidePanel,
}: SpacesScheduleDateTimeModalProps) {
  const [month, setMonth] = useState(() => toStartOfSpacesScheduleMonth(new Date()))

  useEffect(() => {
    if (!open) return
    const seed = parseLocalSpacesScheduleValue(value) ?? nextSpacesScheduleDefault()
    setMonth(toStartOfSpacesScheduleMonth(seed))
  }, [open, value])

  const handleDateSelect = useCallback(
    (day: Date) => {
      const previous = parseLocalSpacesScheduleValue(value) ?? nextSpacesScheduleDefault()
      const next = new Date(day)
      next.setHours(previous.getHours(), previous.getMinutes(), 0, 0)
      onChange(toLocalSpacesScheduleValue(next))
      setMonth(toStartOfSpacesScheduleMonth(next))
    },
    [onChange, value],
  )

  const handleTimeChange = useCallback(
    (nextTime: string | null) => {
      const current = parseLocalSpacesScheduleValue(value) ?? nextSpacesScheduleDefault()
      const next = new Date(current)
      const [hRaw, mRaw] = (nextTime ?? '09:00').split(':')
      const h = Number(hRaw)
      const m = Number(mRaw ?? '0')
      if (Number.isNaN(h) || Number.isNaN(m)) return
      next.setHours(h, m, 0, 0)
      onChange(toLocalSpacesScheduleValue(next))
    },
    [onChange, value],
  )

  const selectedDate = parseLocalSpacesScheduleValue(value)

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        if (!working) onOpenChange(next)
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="z-modal-layer-4 bg-modal-overlay fixed inset-0" />
        <DialogPrimitive.Content className="z-modal-layer-4 p-spacing-4 fixed inset-0 flex items-center justify-center">
          <div className="surface-card wizard-container-border rounded-spacing-4 w-full max-w-xl">
            <div className="px-spacing-6 pt-spacing-4 pb-spacing-2">
              <div className="flex items-center justify-between">
                <DialogPrimitive.Title className="title-h6">{title}</DialogPrimitive.Title>
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="btn-icon-bare"
                  disabled={working}
                  aria-label="Close"
                >
                  <X className="icon-xs" />
                </button>
              </div>
              {subtitle ? (
                <p className="body-3 text-muted-foreground mt-spacing-1 truncate">{subtitle}</p>
              ) : null}
            </div>

            <div className="px-spacing-6 py-spacing-4 gap-spacing-2 flex flex-col">
              <div className="gap-spacing-2 flex items-center">
                <button
                  type="button"
                  onClick={() => {
                    const parsed =
                      parseLocalSpacesScheduleValue(value) ?? nextSpacesScheduleDefault()
                    setMonth(toStartOfSpacesScheduleMonth(parsed))
                  }}
                  className="body-3 h-spacing-8 px-spacing-2 rounded-spacing-2 border-border surface-bg text-foreground min-w-0 flex-1 truncate border text-left"
                >
                  {selectedDate?.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  }) ?? 'Pick date'}
                </button>
                <TimePicker
                  value={formatSpacesScheduleTime(value)}
                  onChange={handleTimeChange}
                  align="end"
                  hideClear
                />
              </div>
              <div
                className={`border-border rounded-spacing-3 grid min-h-[288px] overflow-hidden border ${sidePanel ? 'grid-cols-[minmax(0,1fr)_190px]' : 'grid-cols-1'}`}
              >
                <MonthCalendar
                  month={month}
                  startDate={selectedDate}
                  endDate={null}
                  activeField="due"
                  recurrence={null}
                  onPrevMonth={() =>
                    setMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
                  }
                  onNextMonth={() =>
                    setMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
                  }
                  onSelectDate={handleDateSelect}
                  onJumpToday={() => {
                    const today = new Date()
                    setMonth(toStartOfSpacesScheduleMonth(today))
                    handleDateSelect(today)
                  }}
                />
                {sidePanel ? (
                  <div className="border-border surface-bg flex flex-col border-l">{sidePanel}</div>
                ) : null}
              </div>
            </div>

            <div className="px-spacing-6 py-spacing-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="button-default button-glass-neutral"
                disabled={working}
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={working || confirmDisabled || !value}
                className="button-default button-glass-primary disabled:opacity-50"
              >
                {working ? 'Saving…' : confirmLabel}
              </button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
