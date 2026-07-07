'use client'

import { useState, type FormEvent } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { buildLocalDateFromDayAndHour, dayKey } from '@/components/calendar'
import {
  SPACES_CALENDAR_TOAST_ERRORS,
  SPACES_CALENDAR_TOAST_SUCCESS,
} from '../../config/spaces-toast-errors.config'

type SpaceCalendarQuickTaskComposerProps = {
  day: Date
  dateField: string
  disabled?: boolean
  onCreateItem?: (title: string, extra: Record<string, unknown>) => Promise<unknown>
}

export function SpaceCalendarQuickTaskComposer({
  day,
  dateField,
  disabled = false,
  onCreateItem,
}: SpaceCalendarQuickTaskComposerProps) {
  const [title, setTitle] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedTitle = title.trim()
    if (!trimmedTitle || !onCreateItem || disabled || submitting) return

    const scheduledAt = buildLocalDateFromDayAndHour(dayKey(day), 9).toISOString()
    const extra =
      dateField === 'start_date' || dateField === 'due_date'
        ? { [dateField]: scheduledAt }
        : { custom_data: { [dateField]: scheduledAt } }

    setSubmitting(true)
    try {
      await onCreateItem(trimmedTitle, extra)
      setTitle('')
      toast.success(SPACES_CALENDAR_TOAST_SUCCESS.TASK_CREATED.userMessage)
    } catch {
      toast.error(SPACES_CALENDAR_TOAST_ERRORS.CREATE_TASK_FAILED.userMessage)
    } finally {
      setSubmitting(false)
    }
  }

  if (!onCreateItem) return null

  return (
    <form className="flex items-center gap-spacing-2" onSubmit={handleSubmit}>
      <input
        className="input-glass h-spacing-8 flex-1"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Add task"
        disabled={disabled || submitting}
      />
      <button
        type="submit"
        className="button-compact button-glass-primary h-spacing-8 px-spacing-2"
        disabled={disabled || submitting || title.trim().length === 0}
        aria-label="Add task to calendar"
      >
        <Plus className="icon-sm" aria-hidden="true" />
      </button>
    </form>
  )
}
