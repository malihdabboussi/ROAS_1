import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PROGRAM_WORK_VIEWS,
  normalizeProgramWorkViewId,
  normalizeWorkViewId,
  readVisibleProgramWorkViews,
  resolveWorkViewFromSearch,
} from './work-view-config'

describe('work view config', () => {
  it('normalizes supported work views and rejects unknown values', () => {
    expect(normalizeWorkViewId('board')).toBe('board')
    expect(normalizeWorkViewId('unknown')).toBeNull()
  })

  it('supports Canvas as a Program-level view', () => {
    expect(normalizeProgramWorkViewId('canvas')).toBe('canvas')
    expect(DEFAULT_PROGRAM_WORK_VIEWS).toContain('canvas')
  })

  it('reads deduplicated Program views in canonical order', () => {
    expect(
      readVisibleProgramWorkViews({
        visible_program_views: ['calendar', 'overview', 'list', 'calendar'],
      }),
    ).toEqual(['overview', 'list', 'calendar'])
  })

  it('falls back when persisted Program views are absent or invalid', () => {
    expect(readVisibleProgramWorkViews({})).toEqual(DEFAULT_PROGRAM_WORK_VIEWS)
    expect(readVisibleProgramWorkViews({ visible_program_views: ['invalid'] })).toEqual(
      DEFAULT_PROGRAM_WORK_VIEWS,
    )
  })

  it('prefers the canonical view parameter but supports legacy tab URLs', () => {
    expect(resolveWorkViewFromSearch({ view: 'calendar', tab: 'board' }, 'list')).toBe('calendar')
    expect(resolveWorkViewFromSearch({ view: null, tab: 'board' }, 'list')).toBe('board')
    expect(resolveWorkViewFromSearch({ view: 'unknown', tab: null }, 'list')).toBe('list')
  })
})
