export const PAST_THROUGH_TOMORROW_WINDOW = 'past_through_tomorrow' as const

export function resolveCallDateWindow(view: {
  id?: string
  toolbar_call_date_window?: 'past_through_tomorrow' | 'all' | undefined
}): 'past_through_tomorrow' | 'all' {
  if (view.toolbar_call_date_window === 'all') return 'all'
  if (view.toolbar_call_date_window === PAST_THROUGH_TOMORROW_WINDOW) {
    return PAST_THROUGH_TOMORROW_WINDOW
  }
  if (view.id === 'all-meetings') return PAST_THROUGH_TOMORROW_WINDOW
  return 'all'
}

export function itemCallDateIso(item: {
  custom_data?: Record<string, unknown> | null
}): string | null {
  const raw = item.custom_data?.call_date
  return typeof raw === 'string' && raw.trim() ? raw.trim() : null
}

/** Inclusive: any past day, today, and tomorrow in the given timezone. */
export function isCallDateInPastThroughTomorrow(iso: string | null, now = new Date()): boolean {
  // Undated calls stay visible (e.g. a just-quick-added meeting) so the row
  // doesn't vanish from the view before the user can set its date.
  if (!iso) return true
  const callMs = new Date(iso).getTime()
  if (!Number.isFinite(callMs)) return false
  const end = new Date(now)
  end.setHours(23, 59, 59, 999)
  end.setDate(end.getDate() + 1)
  return callMs <= end.getTime()
}
