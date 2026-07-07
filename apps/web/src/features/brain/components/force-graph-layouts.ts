import type { BrainMemory } from '../types'
import type { OrganizeLayout, SimNode } from './force-graph.types'

export function organizeForceGraphNodes(nodes: SimNode[], layout: OrganizeLayout = 'type') {
  if (nodes.length === 0) return
  const totalNodes = nodes.length
  const orbitRadius = Math.max(300, Math.sqrt(totalNodes) * 30)

  const placeSpiralCluster = (members: SimNode[], cx: number, cy: number, spacing = 22) => {
    members.forEach((n, mi) => {
      const r = spacing * Math.sqrt(mi)
      const a = mi * 2.4
      n.x = cx + r * Math.cos(a)
      n.y = cy + r * Math.sin(a)
      n.vx = 0
      n.vy = 0
    })
  }

  const placeOrbitalGroups = (groups: Record<string, SimNode[]>) => {
    const keys = Object.keys(groups)
    const count = Math.max(1, keys.length)
    keys.forEach((key, gi) => {
      const angle = (2 * Math.PI * gi) / count - Math.PI / 2
      const cx = orbitRadius * Math.cos(angle)
      const cy = orbitRadius * Math.sin(angle)
      placeSpiralCluster(groups[key] ?? [], cx, cy)
    })
  }

  if (layout === 'type') {
    const groups: Record<string, SimNode[]> = {}
    for (const n of nodes) {
      const key =
        n.nodeType === 'snapshot'
          ? `snap_${n.snapshotType ?? 'snapshot'}`
          : n.nodeType === 'experience' || n.nodeType === 'sk_source'
            ? 'experience'
            : n.nodeType === 'sk_entry'
              ? `sk_${(n.memory as BrainMemory).entry_type ?? 'concept'}`
              : n.nodeType === 'belief'
                ? 'belief'
                : n.nodeType === 'perspective'
                  ? 'perspective'
                  : n.memoryType
      if (!groups[key]) groups[key] = []
      groups[key].push(n)
    }
    placeOrbitalGroups(groups)
  } else if (layout === 'time') {
    const now = Date.now()
    const buckets: SimNode[][] = [[], [], [], [], []]
    for (const n of nodes) {
      const age = now - new Date(n.createdAt).getTime()
      const idx =
        age < 86400000
          ? 0
          : age < 604800000
            ? 1
            : age < 2592000000
              ? 2
              : age < 7776000000
                ? 3
                : 4
      buckets[idx]!.push(n)
    }
    const ringStep = 160
    const minArc = 14
    buckets.forEach((members, bi) => {
      if (members.length === 0) return
      const baseR = (bi + 1) * ringStep
      const minCircumference = members.length * minArc
      const requiredR = minCircumference / (2 * Math.PI)
      const subRings = Math.max(1, Math.ceil(requiredR / baseR))
      const subRingGap = 24
      members.forEach((n, mi) => {
        const ringIdx = mi % subRings
        const indexInRing = Math.floor(mi / subRings)
        const ringMembers = Math.ceil(members.length / subRings)
        const r = baseR + ringIdx * subRingGap
        const a = (2 * Math.PI * indexInRing) / Math.max(1, ringMembers) + ringIdx * 0.13
        n.x = r * Math.cos(a)
        n.y = r * Math.sin(a)
        n.vx = 0
        n.vy = 0
      })
    })
  } else if (layout === 'significance') {
    const sorted = [...nodes].sort((a, b) => b.significance - a.significance)
    const spacing = 24
    sorted.forEach((n, i) => {
      const r = spacing * Math.sqrt(i)
      const a = i * 2.39996323
      n.x = r * Math.cos(a)
      n.y = r * Math.sin(a)
      n.vx = 0
      n.vy = 0
    })
  } else if (layout === 'cognition') {
    const perspectives = nodes.filter((n) => n.nodeType === 'perspective')
    const beliefs = nodes.filter((n) => n.nodeType === 'belief')
    const rest = nodes.filter((n) => n.nodeType !== 'perspective' && n.nodeType !== 'belief')
    const place = (members: SimNode[], radius: number) => {
      if (members.length === 0) return
      members.forEach((n, mi) => {
        const a = (2 * Math.PI * mi) / members.length
        n.x = radius * Math.cos(a)
        n.y = radius * Math.sin(a)
        n.vx = 0
        n.vy = 0
      })
    }
    place(perspectives, perspectives.length > 0 ? 90 : 0)
    place(beliefs, 240)
    const restStart = 360
    const restSpacing = 14
    rest.forEach((n, i) => {
      const r = restStart + restSpacing * Math.sqrt(i)
      const a = i * 2.39996323
      n.x = r * Math.cos(a)
      n.y = r * Math.sin(a)
      n.vx = 0
      n.vy = 0
    })
  } else if (layout === 'domain') {
    const groups: Record<string, SimNode[]> = {}
    for (const n of nodes) {
      const m = n.memory as BrainMemory
      const key =
        (m.domain as string | undefined) ||
        (n.nodeType === 'snapshot' ? `snap_${n.snapshotType ?? 'snapshot'}` : null) ||
        (n.nodeType === 'belief' || n.nodeType === 'perspective' ? 'cognition' : null) ||
        m.source_type ||
        'general'
      if (!groups[key]) groups[key] = []
      groups[key].push(n)
    }
    placeOrbitalGroups(groups)
  }
}
