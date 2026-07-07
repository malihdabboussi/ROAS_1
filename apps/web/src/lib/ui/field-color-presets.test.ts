import { describe, expect, it } from 'vitest'
import {
  getProgressBarCellFill,
  initialTagPanelValueFromOption,
  resolveProgressBarFill,
} from './field-color-presets'

describe('field color preset helpers', () => {
  it('resolves default and preset progress fills', () => {
    expect(resolveProgressBarFill(null)).toBe('var(--color-primary)')
    expect(resolveProgressBarFill('blue')).toBe('#60a5fa')
    expect(getProgressBarCellFill('emerald')).toEqual({ className: 'bar-glass-green' })
  })

  it('keeps custom values for the tag panel', () => {
    expect(initialTagPanelValueFromOption('orange')).toBe('#fb923c')
    expect(initialTagPanelValueFromOption('#123456')).toBe('#123456')
    expect(initialTagPanelValueFromOption('linear-gradient(red, blue)')).toBe(
      'linear-gradient(red, blue)',
    )
  })
})
