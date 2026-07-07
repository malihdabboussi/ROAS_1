import { describe, expect, it } from 'vitest'
import {
  formatPresentationElementContext,
  normalizePresentationElementTrace,
} from './presentation-element-trace'

describe('presentation element trace', () => {
  it('normalizes trace payloads and truncates long text snapshots', () => {
    const trace = normalizePresentationElementTrace({
      presentation_id: 'deck-1',
      dom_path: 'section > h1',
      tag_chain: ['section', 'h1'],
      text_snapshot: 'x'.repeat(400),
      slide_index: 0,
      bounds: { x: 1, y: 2, width: 3, height: 4 },
    })

    expect(trace?.text_snapshot?.length).toBeLessThan(300)
    expect(trace?.bounds).toEqual({ x: 1, y: 2, width: 3, height: 4 })
  })

  it('normalizes mixed color flags on computed style', () => {
    const trace = normalizePresentationElementTrace({
      presentation_id: 'deck-1',
      dom_path: 'section > div',
      computed_style: {
        color: null,
        color_mixed: true,
        background_color: '#ffffff',
        background_color_mixed: false,
      },
    })

    expect(trace?.computed_style?.color_mixed).toBe(true)
    expect(trace?.computed_style?.background_color_mixed).toBe(false)
  })

  it('formats context for Vibe', () => {
    const trace = normalizePresentationElementTrace({
      presentation_id: 'deck-1',
      dom_path: 'section > h1',
      text_snapshot: 'Headline',
    })

    expect(trace).not.toBeNull()
    expect(formatPresentationElementContext(trace!)).toContain('<mentioned-element>')
  })
})
