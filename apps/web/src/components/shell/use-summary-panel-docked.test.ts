import { describe, expect, it } from 'vitest'
import { SUMMARY_PANEL_DOCK_MIN_WIDTH } from './use-summary-panel-docked'

describe('summary panel dock breakpoint', () => {
  it('requires a full chat column before docking the summary', () => {
    expect(SUMMARY_PANEL_DOCK_MIN_WIDTH).toBe(1024)
  })
})
