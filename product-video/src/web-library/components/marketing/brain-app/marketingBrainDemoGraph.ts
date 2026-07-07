import type { BrainConnection, BrainMemory } from './types'

const memoryTypes = ['fact', 'decision', 'insight', 'story', 'framework', 'preference', 'event'] as const
const snapshotTypes = ['Belief', 'Model', 'Rule', 'Conviction', 'Principle'] as const
const relTypes = [
  'supports',
  'elaborates',
  'related_to',
  'caused_by',
  'evolved_from',
  'contradicts',
  'emerged_from',
] as const

const skTypes = ['concept', 'framework', 'protocol', 'principle'] as const

const ISO = '2026-03-15T12:00:00Z'

/** Marketing hero copy — matches user-facing “real brain” scale. */
export const MARKETING_BRAIN_DEMO_NODE_COUNT = 369
export const MARKETING_BRAIN_DEMO_EDGE_COUNT = 888

export function getMarketingBrainDemoGraph(): {
  nodes: BrainMemory[]
  connections: BrainConnection[]
} {
  const nodes: BrainMemory[] = []
  let n = 0
  const nid = () => `m-demo-${++n}`

  const memories: BrainMemory[] = []
  const snapshots: BrainMemory[] = []
  const sources: BrainMemory[] = []
  const skEntries: BrainMemory[] = []

  // 1. Generate Memories (294)
  for (const t of memoryTypes) {
    for (let i = 0; i < 42; i++) {
      memories.push({
        id: nid(),
        content: `${t.charAt(0).toUpperCase() + t.slice(1)} ${i + 1}`,
        memory_type: t,
        source_type: 'user',
        significance: 0.35 + (i % 10) * 0.06,
        confidence: 1,
        tags: [],
        recalled_count: 0,
        created_at: ISO,
        updated_at: ISO,
        node_type: 'memory',
      })
    }
  }

  // 2. Generate Snapshots (35)
  for (const st of snapshotTypes) {
    for (let i = 0; i < 7; i++) {
      snapshots.push({
        id: nid(),
        content: `${st} ${i + 1}`,
        memory_type: 'snapshot',
        source_type: 'user',
        significance: 0.82,
        confidence: 1,
        tags: [],
        recalled_count: 0,
        created_at: ISO,
        updated_at: ISO,
        node_type: 'snapshot',
        snapshot_type: st,
        name: `${st} · ${i + 1}`,
      })
    }
  }

  // 3. Generate Sources / Experiences (25)
  for (let e = 0; e < 25; e++) {
    sources.push({
      id: nid(),
      content: `Source: ${e % 2 === 0 ? 'Document' : 'Meeting'} ${e + 1}`,
      memory_type: 'event',
      source_type: e % 2 === 0 ? 'upload' : 'call',
      significance: 0.65,
      confidence: 1,
      tags: [],
      recalled_count: 0,
      created_at: ISO,
      updated_at: ISO,
      node_type: 'experience',
    })
  }

  // 4. Generate SK Knowledge (15)
  const skCounts = [4, 4, 4, 3] as const
  skTypes.forEach((et, idx) => {
    const count = skCounts[idx] ?? 0
    for (let i = 0; i < count; i++) {
      skEntries.push({
        id: nid(),
        content: `SK ${et} ${i + 1}`,
        memory_type: 'framework',
        source_type: 'scholar',
        significance: 0.72,
        confidence: 1,
        tags: [],
        recalled_count: 0,
        created_at: ISO,
        updated_at: ISO,
        node_type: 'sk_entry',
        entry_type: et,
        name: `${et} ${i + 1}`,
      })
    }
  })

  nodes.push(...memories, ...snapshots, ...sources, ...skEntries)

  if (nodes.length !== MARKETING_BRAIN_DEMO_NODE_COUNT) {
    throw new Error(`marketing brain demo: expected ${MARKETING_BRAIN_DEMO_NODE_COUNT} nodes, got ${nodes.length}`)
  }

  const connections: BrainConnection[] = []
  const seen = new Set<string>()
  let cid = 0

  const tryAdd = (a: string, b: string, type?: string) => {
    if (a === b) return
    const key = a <= b ? `${a}|${b}` : `${b}|${a}`
    if (seen.has(key)) return
    seen.add(key)
    const rt = type || relTypes[cid % relTypes.length]!
    connections.push({
      id: `c-demo-${++cid}`,
      source_memory_id: a,
      target_memory_id: b,
      relationship_type: rt,
      strength: 0.42 + (cid % 10) * 0.05,
    })
  }

  // 5. Connect every non-source node to a source (344 connections)
  const nonSourceNodes = [...memories, ...snapshots, ...skEntries]
  nonSourceNodes.forEach((node, idx) => {
    const sourceNode = sources[idx % sources.length]!
    tryAdd(node.id, sourceNode.id, 'emerged_from')
  })

  // 6. Connect sources to each other in a loose chain
  for (let i = 0; i < sources.length; i++) {
    tryAdd(sources[i]!.id, sources[(i + 1) % sources.length]!.id, 'related_to')
  }

  // 7. Add some internal connections between memories/insights to reach 888
  const primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71]
  let p = 0
  while (connections.length < MARKETING_BRAIN_DEMO_EDGE_COUNT) {
    const step = primes[p % primes.length]!
    for (let i = 0; i < nodes.length && connections.length < MARKETING_BRAIN_DEMO_EDGE_COUNT; i++) {
      tryAdd(nodes[i]!.id, nodes[(i + step) % nodes.length]!.id)
    }
    p++
    if (p > 5000) {
      throw new Error('marketing brain demo: could not reach target edge count')
    }
  }

  if (connections.length !== MARKETING_BRAIN_DEMO_EDGE_COUNT) {
    throw new Error(
      `marketing brain demo: expected ${MARKETING_BRAIN_DEMO_EDGE_COUNT} edges, got ${connections.length}`,
    )
  }

  return { nodes, connections }
}
