import type { MissionAgent } from '@/lib/agents'
import type { Mission } from '@/lib/missions'
import type { MissionGroupBy } from '../types/space-schema'

export interface MissionGroup {
  key: string
  label: string
  color?: string
  missions: Mission[]
  /** Group by assignee: agent image for header (no glass chip) */
  avatarUrl?: string | null
}

/** Semantic keys — `spaceGroupBadgeGlassClass` / `GroupSection` chip map (not row status pill classes). */
const STATUS_BUCKETS: { key: string; label: string; color: string; statuses: string[] }[] = [
  {
    key: 'open',
    label: 'Open',
    color: 'amber',
    statuses: [
      'inbox',
      'backlog',
      'planning',
      'pending_approval',
      'awaiting_access_approval',
      'todo',
      'in_progress',
      'awaiting_human',
      'review',
    ],
  },
  { key: 'blocked', label: 'Blocked', color: 'orange', statuses: ['blocked'] },
  { key: 'done', label: 'Done', color: 'emerald', statuses: ['done'] },
  {
    key: 'failed',
    label: 'Failed',
    color: 'red',
    statuses: ['error', 'failed', 'dead_letter'],
  },
  { key: 'archived', label: 'Archived', color: 'slate', statuses: ['archived'] },
]

const PRIORITY_ORDER: { key: string; label: string; color: string }[] = [
  { key: 'urgent', label: 'Urgent', color: 'red' },
  { key: 'high', label: 'High', color: 'orange' },
  { key: 'medium', label: 'Medium', color: 'amber' },
  { key: 'low', label: 'Low', color: 'slate' },
]

function statusBucketKey(status: string): string {
  for (const b of STATUS_BUCKETS) {
    if (b.statuses.includes(status)) return b.key
  }
  return 'open'
}

function dateGroupKey(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function dateGroupLabel(key: string): string {
  const d = new Date(key + 'T00:00:00')
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function groupMissions(
  missions: Mission[],
  groupBy: MissionGroupBy,
  groupSort: 'asc' | 'desc',
  showEmpty: boolean,
  showClosed: boolean,
  agents?: MissionAgent[],
): MissionGroup[] {
  let filtered = missions
  if (!showClosed) {
    filtered = missions.filter(
      (m) =>
        m.status !== 'done' &&
        m.status !== 'archived' &&
        m.status !== 'failed' &&
        m.status !== 'dead_letter',
    )
  }

  switch (groupBy) {
    case 'status': {
      const groups: MissionGroup[] = STATUS_BUCKETS.map((b) => ({
        key: b.key,
        label: b.label,
        color: b.color,
        missions: [],
      }))
      const map = new Map(groups.map((g) => [g.key, g]))
      for (const m of filtered) {
        const bk = statusBucketKey(m.status)
        map.get(bk)?.missions.push(m)
      }
      const result = showEmpty ? groups : groups.filter((g) => g.missions.length > 0)
      if (groupSort === 'desc') result.reverse()
      return result
    }

    case 'priority': {
      const groups: MissionGroup[] = PRIORITY_ORDER.map((p) => ({
        key: p.key,
        label: p.label,
        color: p.color,
        missions: [],
      }))
      const map = new Map(groups.map((g) => [g.key, g]))
      for (const m of filtered) {
        map.get(m.priority)?.missions.push(m)
      }
      const result = showEmpty ? groups : groups.filter((g) => g.missions.length > 0)
      if (groupSort === 'desc') result.reverse()
      return result
    }

    case 'assignee': {
      const agentMap = new Map((agents ?? []).map((a) => [a.agent_key, a]))
      const map = new Map<string, MissionGroup>()
      const unassigned: MissionGroup = {
        key: '__unassigned__',
        label: 'Unassigned',
        color: 'muted',
        missions: [],
      }
      for (const m of filtered) {
        const key = m.assigned_agent_key ?? '__unassigned__'
        if (key === '__unassigned__') {
          unassigned.missions.push(m)
        } else {
          if (!map.has(key)) {
            const agent = agentMap.get(key)
            map.set(key, {
              key,
              label: agent?.name ?? key,
              color: 'violet',
              avatarUrl: agent?.image_url ?? null,
              missions: [],
            })
          }
          map.get(key)!.missions.push(m)
        }
      }
      const groups = [...map.values()]
      groups.sort((a, b) =>
        groupSort === 'asc' ? a.label.localeCompare(b.label) : b.label.localeCompare(a.label),
      )
      if (unassigned.missions.length > 0 || showEmpty) groups.push(unassigned)
      return groups
    }

    case 'created_at':
    case 'updated_at': {
      const field = groupBy === 'created_at' ? 'created_at' : 'updated_at'
      const map = new Map<string, MissionGroup>()
      for (const m of filtered) {
        const key = dateGroupKey(m[field])
        if (!map.has(key)) {
          map.set(key, { key, label: dateGroupLabel(key), color: 'blue', missions: [] })
        }
        map.get(key)!.missions.push(m)
      }
      const groups = [...map.values()]
      groups.sort((a, b) =>
        groupSort === 'asc' ? a.key.localeCompare(b.key) : b.key.localeCompare(a.key),
      )
      return groups
    }
  }
}
