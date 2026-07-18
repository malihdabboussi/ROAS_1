import { describe, expect, it } from 'vitest'
import {
  activateSpaceWorkTab,
  closeSpaceWorkTab,
  normalizeSpaceWorkSession,
  spaceWorkTabKindFromViewType,
  upsertSpaceWorkTab,
  type SpaceWorkTab,
} from './space-work-tabs'

function tab(partial: Partial<SpaceWorkTab> & Pick<SpaceWorkTab, 'id'>): SpaceWorkTab {
  return {
    kind: 'doc',
    title: 'Doc',
    spaceId: 'space-1',
    ...partial,
  }
}

describe('space-work-tabs', () => {
  it('upserts, activates, and closes tabs with a stable active id', () => {
    let session = upsertSpaceWorkTab(
      { tabs: [], activeTabId: null },
      tab({ id: 'a', title: 'Alpha' }),
    )
    expect(session.activeTabId).toBe('a')
    session = upsertSpaceWorkTab(session, tab({ id: 'b', title: 'Beta', kind: 'task' }))
    expect(session.tabs.map((row) => row.id)).toEqual(['b', 'a'])
    expect(session.activeTabId).toBe('b')

    session = activateSpaceWorkTab(session, 'a')
    expect(session.activeTabId).toBe('a')

    session = closeSpaceWorkTab(session, 'a')
    expect(session.tabs.map((row) => row.id)).toEqual(['b'])
    expect(session.activeTabId).toBe('b')

    session = closeSpaceWorkTab(session, 'b')
    expect(session).toEqual({ tabs: [], activeTabId: null })
  })

  it('normalizes corrupt persisted sessions', () => {
    expect(
      normalizeSpaceWorkSession({
        tabs: [{ id: 'ok', kind: 'doc', title: 'Ok', spaceId: 'space-1' }, { id: '' } as never],
        activeTabId: 'missing',
      }),
    ).toEqual({
      tabs: [{ id: 'ok', kind: 'doc', title: 'Ok', spaceId: 'space-1' }],
      activeTabId: 'ok',
    })
  })

  it('maps view types to tab kinds', () => {
    expect(spaceWorkTabKindFromViewType('doc')).toBe('doc')
    expect(spaceWorkTabKindFromViewType('task')).toBe('task')
    expect(spaceWorkTabKindFromViewType(undefined)).toBe('task')
  })
})
