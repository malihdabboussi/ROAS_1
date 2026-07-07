import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { OptionDot } from './OptionDot'

describe('OptionDot', () => {
  it('renders preset color dots with the existing small size classes', () => {
    const { container } = render(<OptionDot color="cyan" size="sm" />)

    const outer = container.firstElementChild as HTMLElement
    const inner = outer.firstElementChild as HTMLElement

    expect(outer.className).toContain('h-[10px] w-[10px]')
    expect(outer.className).toContain('shadow-[0_0_0_1.5px_rgb(34_211_238/0.6)]')
    expect(inner.className).toContain('h-[6px] w-[6px]')
    expect(inner.className).toContain('bg-cyan-500')
  })

  it('renders custom color dots with inline ring and fill styles', () => {
    const { container } = render(<OptionDot color="#123456" />)

    const outer = container.firstElementChild as HTMLElement
    const inner = outer.firstElementChild as HTMLElement

    expect(outer.getAttribute('style')).toContain('#12345699')
    expect(inner.getAttribute('style')).toContain('background')
  })
})
