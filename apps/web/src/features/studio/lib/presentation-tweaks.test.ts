import { describe, expect, it } from 'vitest'
import { parsePresentationTweakBlocks, writePresentationTweakBlock } from './presentation-tweaks'

describe('presentation tweaks', () => {
  it('parses and rewrites tweak blocks while preserving surrounding source', () => {
    const source =
      'const a = 1;\n/*EDITMODE-BEGIN*/{"id":"hero","title":"Hero"}/*EDITMODE-END*/\nconst b = 2;'
    const [block] = parsePresentationTweakBlocks(source)

    expect(block?.id).toBe('hero')

    const next = writePresentationTweakBlock(source, block!, { id: 'hero', title: 'Updated' })
    expect(next).toContain('const a = 1;')
    expect(next).toContain('"title": "Updated"')
    expect(next).toContain('const b = 2;')
  })
})
