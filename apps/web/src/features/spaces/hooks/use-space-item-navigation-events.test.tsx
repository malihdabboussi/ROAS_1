import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SpaceItem } from '../types'
import {
  useSpaceItemNavigationEvents,
  useSpaceSelectedItemSync,
} from './use-space-item-navigation-events'

const navigationMocks = vi.hoisted(() => ({
  replace: vi.fn(),
  setActiveSpace: vi.fn(),
  searchParams: new URLSearchParams(),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => '/spaces',
  useRouter: () => ({ replace: navigationMocks.replace }),
  useSearchParams: () => navigationMocks.searchParams,
}))

vi.mock('../store/use-spaces-store', () => ({
  useSpacesStore: (
    selector: (state: {
      setActiveSpace: typeof navigationMocks.setActiveSpace
      spaces: Array<{ id: string }>
    }) => unknown,
  ) =>
    selector({
      setActiveSpace: navigationMocks.setActiveSpace,
      spaces: [{ id: 'space-1' }],
    }),
}))

function taskItem(id: string): SpaceItem {
  return {
    id,
    space_id: 'space-1',
    title: 'Open me',
    status: 'todo',
    parent_item_id: null,
    custom_data: {},
    created_at: '2026-07-27T00:00:00.000Z',
    updated_at: '2026-07-27T00:00:00.000Z',
  } as SpaceItem
}

describe('useSpaceItemNavigationEvents', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    navigationMocks.searchParams = new URLSearchParams('space=space-1&item=task-1')
  })

  it('opens a deep-linked item once items load without marking a miss as handled', () => {
    const openSpaceItemModal = vi.fn()
    const focusTaskCapableViewIfNeeded = vi.fn()
    const setDocEditorItem = vi.fn()
    const setSelectedItem = vi.fn()

    const { rerender } = renderHook(
      ({ items, loaded }) =>
        useSpaceItemNavigationEvents({
          activeSpaceId: 'space-1',
          items,
          itemsLoadedForSpaceId: loaded,
          focusTaskCapableViewIfNeeded,
          openSpaceItemModal,
          setDocEditorItem,
          setSelectedItem,
        }),
      {
        initialProps: {
          items: [] as SpaceItem[],
          loaded: 'space-1' as string | null,
        },
      },
    )

    expect(openSpaceItemModal).not.toHaveBeenCalled()

    rerender({ items: [taskItem('task-1')], loaded: 'space-1' })

    expect(openSpaceItemModal).toHaveBeenCalledWith(expect.objectContaining({ id: 'task-1' }))
    expect(focusTaskCapableViewIfNeeded).toHaveBeenCalledWith('space-1')
  })
})

describe('useSpaceSelectedItemSync', () => {
  it('refreshes the selected item from the store without clearing during temporary misses', () => {
    const setSelectedItem = vi.fn()
    const selected = taskItem('task-1')
    const fresher = { ...selected, title: 'Updated' }

    const { rerender } = renderHook(
      ({ items, selectedItem }) => useSpaceSelectedItemSync(items, selectedItem, setSelectedItem),
      {
        initialProps: {
          items: [selected],
          selectedItem: selected as SpaceItem | null,
        },
      },
    )

    act(() => {
      rerender({ items: [fresher], selectedItem: selected })
    })
    expect(setSelectedItem).toHaveBeenCalledWith(fresher)

    setSelectedItem.mockClear()
    act(() => {
      rerender({ items: [], selectedItem: selected })
    })
    expect(setSelectedItem).not.toHaveBeenCalled()
  })
})
