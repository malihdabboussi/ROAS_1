import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ViewDef } from '../types/space-schema'
import { useViewStripActions } from './use-view-strip-actions'

vi.mock('../services/spaces.service', () => ({ updateSpace: vi.fn() }))
vi.mock('../store/use-spaces-store', () => ({
  useSpacesStore: { setState: vi.fn(), getState: () => ({ createSpace: vi.fn() }) },
}))

function view(id: string, pinned?: boolean): ViewDef {
  return {
    id,
    type: 'list',
    name: id,
    ...(pinned === undefined ? {} : { pinned_to_start: pinned }),
  }
}

function run(views: ViewDef[], embed: { leading?: string | null; defaults?: string[] }) {
  const { result } = renderHook(() =>
    useViewStripActions({
      embedLeadingViewId: embed.leading ?? null,
      embedDefaultPinnedViewIds: embed.defaults,
      visibleViews: views,
      activeSchema: undefined,
      activeSpace: null,
      patchActiveSpaceSchema: vi.fn(),
      setActiveView: vi.fn(),
    }),
  )
  return result.current.orderedVisibleViews
}

describe('useViewStripActions ordering', () => {
  it('keeps original order without leading view or defaults', () => {
    const ordered = run([view('a'), view('b')], {})
    expect(ordered.map((v) => v.id)).toEqual(['a', 'b'])
  })

  it('orders leading view first, then pinned, then the rest', () => {
    const ordered = run([view('a'), view('b', true), view('lead'), view('c')], { leading: 'lead' })
    expect(ordered.map((v) => v.id)).toEqual(['lead', 'b', 'a', 'c'])
  })

  it('applies surface-default pins while no view has an explicit pin', () => {
    const ordered = run([view('lead'), view('a'), view('agenda'), view('b')], {
      leading: 'lead',
      defaults: ['agenda'],
    })
    expect(ordered.map((v) => v.id)).toEqual(['lead', 'agenda', 'a', 'b'])
    expect(ordered[1]?.pinned_to_start).toBe(true)
  })

  it('drops surface defaults once any view carries an explicit pin preference', () => {
    const ordered = run([view('lead'), view('a', true), view('agenda', false), view('b')], {
      leading: 'lead',
      defaults: ['agenda'],
    })
    expect(ordered.map((v) => v.id)).toEqual(['lead', 'a', 'agenda', 'b'])
    expect(ordered.find((v) => v.id === 'agenda')?.pinned_to_start).toBe(false)
  })
})
