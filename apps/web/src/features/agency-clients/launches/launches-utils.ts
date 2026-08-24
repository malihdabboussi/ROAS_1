import type { AgencyLaunch } from '@/lib/agency-clients'
import { openArtifactInShell } from '@/lib/artifacts'

export function eventTone(kind: string) {
  if (kind === 'launch') return 'border-success/30 bg-success/10 text-success'
  if (kind === 'assets_due') return 'border-destructive/30 bg-destructive/10 text-destructive'
  if (kind === 'onboarding') return 'border-primary/30 bg-primary/10 text-primary'
  return 'border-info/30 bg-info/10 text-info'
}

export function openLaunch(launch: AgencyLaunch) {
  openArtifactInShell({
    id: launch.id,
    entityId: launch.campaign_id || launch.id,
    entityTable: 'page_grader_launches',
    spaceId: launch.roas_space_id,
    title: launch.name,
    type: 'custom_object',
    content: JSON.stringify(launch),
    contextLabel: 'Launches',
  })
}

export function readable(value: string) {
  return value.replace(/[_-]/g, ' ').toLowerCase()
}

export function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1)
}

export function dateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function calendarDays(month: Date) {
  const first = startOfMonth(month)
  const start = new Date(first)
  start.setDate(first.getDate() - first.getDay())
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start)
    day.setDate(start.getDate() + index)
    return day
  })
}
