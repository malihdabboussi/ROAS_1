import { describe, expect, it } from 'vitest'
import {
  BRAIN_CONSTELLATION_DELAY_STEPS,
  BRAIN_CONSTELLATION_LINKS,
  BRAIN_CONSTELLATION_NODES,
  BRAIN_CONSTELLATION_VIEWBOX,
} from './brain-constellation-layout'

describe('brain constellation layout', () => {
  it('keeps every node inside the viewBox so nothing clips while rotating', () => {
    const center = BRAIN_CONSTELLATION_VIEWBOX / 2
    for (const node of BRAIN_CONSTELLATION_NODES) {
      const distance = Math.hypot(node.x - center, node.y - center)
      expect(distance + node.r).toBeLessThanOrEqual(center)
    }
  })

  it('staggers pulse delays across the available steps', () => {
    const steps = new Set(BRAIN_CONSTELLATION_NODES.map((node) => node.delayStep))
    expect(steps.size).toBe(BRAIN_CONSTELLATION_DELAY_STEPS)
  })

  it('links every node except the first seed', () => {
    const linked = new Set(BRAIN_CONSTELLATION_LINKS.map((link) => `${link.x1}:${link.y1}`))
    expect(linked.size).toBe(BRAIN_CONSTELLATION_NODES.length - 1)
  })
})
