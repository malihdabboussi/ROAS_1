import { describe, expect, it } from 'vitest'
import { resolveTaskCapableViewId } from './resolve-task-capable-view'

describe('resolveTaskCapableViewId', () => {
  const views = [
    { id: 'media-1', type: 'media' },
    { id: 'list-1', type: 'list' },
    { id: 'kanban-1', type: 'kanban' },
  ]

  it('returns null when already on a task-capable view', () => {
    expect(resolveTaskCapableViewId(views, 'list-1')).toBeNull()
    expect(resolveTaskCapableViewId(views, 'kanban-1')).toBeNull()
  })

  it('prefers list when current view cannot show tasks', () => {
    expect(resolveTaskCapableViewId(views, 'media-1')).toBe('list-1')
  })

  it('returns null when no task-capable view exists', () => {
    expect(resolveTaskCapableViewId([{ id: 'media-1', type: 'media' }], 'media-1')).toBeNull()
  })
})
