import { describe, expect, it } from 'vitest'
import { extractConceptBodies } from './ad-concept-concepts'

describe('extractConceptBodies', () => {
  it('parses **Concept N** markdown', () => {
    const text = `Intro line.

**Concept 1**
Left side dark. Right side win. ${'x'.repeat(30)}

**Concept 2**
Another full paragraph here with enough chars. ${'y'.repeat(30)}`
    const r = extractConceptBodies(text)
    expect(r).toHaveLength(2)
    expect(r[0]?.n).toBe(1)
    expect(r[0]?.body).toContain('Left side dark')
    expect(r[1]?.n).toBe(2)
    expect(r[1]?.body).toContain('Another full')
  })

  it('parses ## Concept N', () => {
    const text = `## Concept 1
${'A'.repeat(50)}

## Concept 3
${'B'.repeat(50)}`
    const r = extractConceptBodies(text)
    expect(r).toHaveLength(2)
    expect(r[0]?.n).toBe(1)
    expect(r[1]?.n).toBe(3)
  })

  it('returns empty for short chunks', () => {
    expect(extractConceptBodies('**Concept 1**\nshort')).toHaveLength(0)
  })

  it('returns empty when no markers', () => {
    expect(extractConceptBodies('Just prose without structure.')).toHaveLength(0)
  })
})
