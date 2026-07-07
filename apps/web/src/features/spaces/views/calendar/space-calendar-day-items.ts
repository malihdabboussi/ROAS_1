import { dayKey, parseCalendarDate } from '@/components/calendar'
import { readFieldValue } from '../../components/space-item-values'
import type { SpaceItem } from '../../types'

export function itemsScheduledOnDay(
  items: SpaceItem[],
  dateField: string,
  day: Date,
): SpaceItem[] {
  const targetKey = dayKey(day)
  return items.filter((item) => {
    const raw = readFieldValue(item, dateField)
    if (typeof raw !== 'string' || raw.length === 0) return false
    const parsed = parseCalendarDate(raw)
    if (!parsed) return false
    return dayKey(parsed) === targetKey
  })
}
