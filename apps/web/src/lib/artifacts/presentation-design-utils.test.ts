import { describe, expect, it } from 'vitest'
import { cssColorToHex, cssColorToHexOrDefault } from './presentation-design-utils'

describe('cssColorToHex', () => {
  it('returns null for transparent colors', () => {
    expect(cssColorToHex('transparent')).toBeNull()
    expect(cssColorToHex('rgba(0, 0, 0, 0)')).toBeNull()
  })

  it('normalizes short and long hex', () => {
    expect(cssColorToHex('#abc')).toBe('#aabbcc')
    expect(cssColorToHex('#112233')).toBe('#112233')
  })

  it('parses rgb and hsl', () => {
    expect(cssColorToHex('rgb(255, 0, 128)')).toBe('#ff0080')
    expect(cssColorToHex('rgb(255 0 128)')).toBe('#ff0080')
    expect(cssColorToHex('hsl(0, 100%, 50%)')).toBe('#ff0000')
  })

  it('uses fallback when color is missing', () => {
    expect(cssColorToHexOrDefault(null, '#ffffff')).toBe('#ffffff')
    expect(cssColorToHexOrDefault('rgb(0, 0, 0)', '#ffffff')).toBe('#000000')
  })
})
