import { describe, expect, it } from 'vitest'
import { FunnelPagesController } from '../funnel-pages.controller'

function methodIndex(methodName: string): number {
  return Object.getOwnPropertyNames(FunnelPagesController.prototype).indexOf(methodName)
}

describe('FunnelsController route order', () => {
  it('keeps page collection actions before page id actions', () => {
    expect(methodIndex('reorderPages')).toBeGreaterThan(-1)
    expect(methodIndex('updatePage')).toBeGreaterThan(-1)
    expect(methodIndex('reorderPages')).toBeLessThan(methodIndex('updatePage'))
  })
})
