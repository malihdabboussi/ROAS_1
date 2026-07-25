export type BrainConstellationTone =
  | 'fact'
  | 'decision'
  | 'insight'
  | 'story'
  | 'framework'
  | 'preference'

export interface BrainConstellationNode {
  x: number
  y: number
  r: number
  tone: BrainConstellationTone
  delayStep: number
}

export interface BrainConstellationLink {
  x1: number
  y1: number
  x2: number
  y2: number
}

export const BRAIN_CONSTELLATION_VIEWBOX = 200
export const BRAIN_CONSTELLATION_DELAY_STEPS = 6

const TONES: BrainConstellationTone[] = [
  'fact',
  'decision',
  'insight',
  'story',
  'framework',
  'preference',
]
const NODE_COUNT = 64
const LINKS_PER_NODE = 2
const CENTER = BRAIN_CONSTELLATION_VIEWBOX / 2
const MAX_RADIUS = CENTER - 8

/**
 * Deterministic so the server-rendered `brain/loading.tsx` markup matches the
 * client and the placeholder never reflows on hydration.
 */
function createSeededRandom(seed: number): () => number {
  let state = seed
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296
  }
}

function buildNodes(): BrainConstellationNode[] {
  const random = createSeededRandom(20260724)
  const nodes: BrainConstellationNode[] = []
  for (let index = 0; index < NODE_COUNT; index += 1) {
    // Bias samples toward the middle so the cloud reads as a dense core with a
    // sparse halo, the same shape the loaded force graph settles into.
    const radius = MAX_RADIUS * random() ** 1.7
    const angle = random() * Math.PI * 2
    const isHub = index < 6
    const tone = TONES[index % TONES.length] ?? 'fact'
    nodes.push({
      x: Number((CENTER + Math.cos(angle) * radius).toFixed(2)),
      y: Number((CENTER + Math.sin(angle) * radius).toFixed(2)),
      r: isHub ? 3.4 : 1.1 + random() * 1.5,
      tone,
      delayStep: index % BRAIN_CONSTELLATION_DELAY_STEPS,
    })
  }
  return nodes
}

function buildLinks(nodes: BrainConstellationNode[]): BrainConstellationLink[] {
  const links: BrainConstellationLink[] = []
  for (let index = 1; index < nodes.length; index += 1) {
    const node = nodes[index]
    if (!node) continue
    const nearest = nodes
      .slice(0, index)
      .map((candidate, candidateIndex) => ({
        candidateIndex,
        distance: (candidate.x - node.x) ** 2 + (candidate.y - node.y) ** 2,
      }))
      .sort((left, right) => left.distance - right.distance)
      .slice(0, LINKS_PER_NODE)
    for (const { candidateIndex } of nearest) {
      const target = nodes[candidateIndex]
      if (!target) continue
      links.push({ x1: node.x, y1: node.y, x2: target.x, y2: target.y })
    }
  }
  return links
}

export const BRAIN_CONSTELLATION_NODES = buildNodes()
export const BRAIN_CONSTELLATION_LINKS = buildLinks(BRAIN_CONSTELLATION_NODES)
