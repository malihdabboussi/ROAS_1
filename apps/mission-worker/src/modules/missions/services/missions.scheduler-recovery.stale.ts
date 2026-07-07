import { priorityToRank } from '../types'

export function staleMinutesForPriority(priority: string | null | undefined): number {
  const rank = priorityToRank(priority)
  if (rank <= 1) return 2
  if (rank === 2) return 5
  if (rank === 3) return 10
  return 15
}

export function isPastPriorityStaleThreshold(
  updatedAt: string | null | undefined,
  priority: string | null | undefined,
): boolean {
  if (!updatedAt) return false
  const staleMinutes = staleMinutesForPriority(priority)
  const updatedAtMs = new Date(updatedAt).getTime()
  if (!Number.isFinite(updatedAtMs)) return false
  return Date.now() - updatedAtMs >= staleMinutes * 60_000
}
