import { describe, expect, it } from 'vitest'
import {
  kanbanBoardColumnTintSource,
  selectOptionControlChrome,
  spaceGroupBadgeChipProps,
} from '../space-group-badge-glass'

describe('space-group-badge-glass', () => {
  it('uses curated badge glass classes for named colors', () => {
    expect(spaceGroupBadgeChipProps('cyan')).toEqual({ chipClassName: 'badge-glass-cyan' })
    expect(spaceGroupBadgeChipProps()).toEqual({ chipClassName: 'badge-glass-muted' })
  })

  it('uses custom styles for preset and hex colors outside the curated map', () => {
    const preset = spaceGroupBadgeChipProps('pink')
    const custom = spaceGroupBadgeChipProps('#abc')

    expect(preset.chipClassName).toBe('backdrop-blur-sm')
    expect(preset.style?.background).toContain('linear-gradient')
    expect(custom.chipClassName).toBe('backdrop-blur-sm')
    expect(custom.style?.color).toBe('#aabbcc')
  })

  it('resolves kanban tint sources and select control chrome fallbacks', () => {
    expect(kanbanBoardColumnTintSource('pink', false)).toBe('#f472b6')
    expect(kanbanBoardColumnTintSource('#abc', false)).toBe('#aabbcc')
    expect(kanbanBoardColumnTintSource('cyan', true)).toBeNull()

    expect(selectOptionControlChrome('').pillClass).toContain('color-muted')
    expect(selectOptionControlChrome('pink').pillStyle?.color).toBe('#f472b6')
  })
})
