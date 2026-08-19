import { describe, expect, it } from 'vitest'
import { applyDefaultPins, orderViewsForStrip, reconcilePinsAfterReorder } from './order-views-for-strip'

const v = (id: string, pinned = false) => ({ id, pinned_to_start: pinned })

describe('orderViewsForStrip', () => {
  it('renders pinned views first, in schema order, before unpinned ones', () => {
    const out = orderViewsForStrip([v('a'), v('b', true), v('c'), v('d', true)])
    expect(out.map((x) => x.id)).toEqual(['b', 'd', 'a', 'c'])
  })

  it('keeps the leading view ahead of pins (Meetings: All Meetings, then Agenda)', () => {
    const out = orderViewsForStrip(
      [v('today'), v('agenda', true), v('all-meetings'), v('people')],
      'all-meetings',
    )
    expect(out.map((x) => x.id)).toEqual(['all-meetings', 'agenda', 'today', 'people'])
  })

  it('is stable when nothing is pinned', () => {
    const out = orderViewsForStrip([v('a'), v('b'), v('c')])
    expect(out.map((x) => x.id)).toEqual(['a', 'b', 'c'])
  })
})

describe('reconcilePinsAfterReorder', () => {
  it('pins a tab dropped into the pinned zone', () => {
    const out = reconcilePinsAfterReorder([v('p1', true), v('n1'), v('p2', true), v('n2')], 'n1')
    expect(out.find((x) => x.id === 'n1')?.pinned_to_start).toBe(true)
  })

  it('unpins a pinned tab dragged after an unpinned tab', () => {
    const out = reconcilePinsAfterReorder([v('p1', true), v('n1'), v('p2', true)], 'p2')
    expect(out.find((x) => x.id === 'p2')?.pinned_to_start).toBe(false)
  })

  it('never clears other pins on an ordinary reorder', () => {
    const out = reconcilePinsAfterReorder([v('p1', true), v('n2'), v('n1')], 'n2')
    expect(out.map((x) => x.pinned_to_start)).toEqual([true, false, false])
  })

  it('does not pin a tab dropped after the leading view when nothing else is pinned', () => {
    const out = reconcilePinsAfterReorder([v('all-meetings'), v('n1'), v('n2')], 'n1', 'all-meetings')
    expect(out.every((x) => !x.pinned_to_start)).toBe(true)
  })
})

describe('applyDefaultPins', () => {
  it('pins default views only while the user never toggled them', () => {
    const out = applyDefaultPins(
      [{ id: 'agenda' }, { id: 'people', pinned_to_start: undefined }, v('all-meetings')],
      ['agenda'],
    )
    expect(out.find((x) => x.id === 'agenda')?.pinned_to_start).toBe(true)
    expect(out.find((x) => x.id === 'people')?.pinned_to_start).toBeUndefined()
  })

  it('respects an explicit unpin', () => {
    const out = applyDefaultPins([{ id: 'agenda', pinned_to_start: false }], ['agenda'])
    expect(out[0]?.pinned_to_start).toBe(false)
  })
})
