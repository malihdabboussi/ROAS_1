import { describe, expect, it } from 'vitest'
import {
  positionModelEditPanelFromMenuAnchor,
  resolveModelPickerMenuAnchorRect,
} from './model-picker-edit-panel-position'

function rect(overrides: Partial<DOMRect>): DOMRect {
  return {
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    width: 0,
    height: 0,
    toJSON: () => ({}),
    ...overrides,
  }
}

describe('model-picker-edit-panel-position', () => {
  it('anchors edit panel to the rightmost open menu', () => {
    const dropdown = rect({ top: 200, left: 100, right: 340, width: 240, height: 360, bottom: 560 })
    const submenu = rect({ top: 220, left: 344, right: 584, width: 240, height: 280, bottom: 500 })

    expect(resolveModelPickerMenuAnchorRect(dropdown, submenu)).toBe(submenu)
    expect(positionModelEditPanelFromMenuAnchor(submenu, 240, 360, 8)).toEqual({
      top: 220,
      left: 592,
    })
  })

  it('falls back to the main dropdown when the submenu is not mounted', () => {
    const dropdown = rect({ top: 200, left: 100, right: 340, width: 240, height: 360, bottom: 560 })

    expect(resolveModelPickerMenuAnchorRect(dropdown, null)).toBe(dropdown)
    expect(positionModelEditPanelFromMenuAnchor(dropdown, 240, 360, 8)).toEqual({
      top: 200,
      left: 348,
    })
  })
})
