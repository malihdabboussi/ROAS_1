import { afterEach, describe, expect, it, vi } from 'vitest'
import { fixedFloatingPortalStyle, positionFloatingMenuFromAnchorRect } from './floating-menu-anchor'

const anchor = {
  top: 500,
  left: 700,
  bottom: 528,
  right: 820,
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('positionFloatingMenuFromAnchorRect', () => {
  it('aligns to the anchor start edge by default', () => {
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(900)
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1200)

    const pos = positionFloatingMenuFromAnchorRect(anchor, {
      menuWidth: 288,
      menuHeight: 240,
    })

    expect(pos.left).toBe(700)
    expect(pos.placement).toBe('above')
    expect(pos.top).toBe(252)
  })

  it('aligns to the anchor end edge when requested', () => {
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(900)
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1200)

    const pos = positionFloatingMenuFromAnchorRect(anchor, {
      menuWidth: 288,
      menuHeight: 240,
      horizontalAlign: 'end',
    })

    expect(pos.left).toBe(532)
    expect(pos.placement).toBe('above')
  })

  it('opens below when there is more room under the anchor', () => {
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(900)
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1200)

    const pos = positionFloatingMenuFromAnchorRect(
      { top: 120, left: 700, bottom: 148, right: 820 },
      {
        menuWidth: 288,
        menuHeight: 240,
      },
    )

    expect(pos.placement).toBe('below')
    expect(pos.top).toBe(156)
  })
})

describe('fixedFloatingPortalStyle', () => {
  it('builds the existing fixed portal style shape from a top-left position', () => {
    expect(fixedFloatingPortalStyle({ top: 120, left: 80 })).toEqual({
      position: 'fixed',
      top: 120,
      left: 80,
    })
  })

  it('keeps lifted dropdown transforms and numeric widths in the shared helper', () => {
    expect(
      fixedFloatingPortalStyle(
        { top: 120, left: 80 },
        { transform: 'translateY(-100%)', width: 448 },
      ),
    ).toEqual({
      position: 'fixed',
      top: 120,
      left: 80,
      transform: 'translateY(-100%)',
      width: 448,
    })
  })
})
