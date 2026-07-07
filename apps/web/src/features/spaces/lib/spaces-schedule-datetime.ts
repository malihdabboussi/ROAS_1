export function toLocalSpacesScheduleValue(date: Date): string {
  const pad = (v: number) => String(v).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function parseLocalSpacesScheduleValue(value: string): Date | null {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function toStartOfSpacesScheduleMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function nextSpacesScheduleDefault(): Date {
  const d = new Date()
  d.setHours(d.getHours() + 1, 0, 0, 0)
  return d
}

export function formatSpacesScheduleTime(value: string): string | null {
  const parsed = parseLocalSpacesScheduleValue(value)
  if (!parsed) return null
  return `${String(parsed.getHours()).padStart(2, '0')}:${String(parsed.getMinutes()).padStart(2, '0')}`
}
