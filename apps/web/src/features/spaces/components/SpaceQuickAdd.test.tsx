import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SpaceQuickAdd } from './SpaceQuickAdd'
import type { FieldDef } from '../types/space-schema'

const storeState = {
  activeSpaceId: 'space-1',
  createItem: vi.fn(),
  inlineTaskComposerFocusNonce: 0,
}

vi.mock('../store/use-spaces-store', () => ({
  useSpacesStore: (selector: (state: typeof storeState) => unknown) => selector(storeState),
}))

const titleField: FieldDef = {
  id: 'title',
  name: 'Name',
  type: 'text',
}

describe('SpaceQuickAdd', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('delegates inactive row activation to the supplied action', () => {
    const openAddDocMenu = vi.fn()

    render(
      <SpaceQuickAdd
        allFields={[titleField]}
        displayCols={[titleField]}
        gridTemplateColumns="minmax(0, 1fr)"
        addTaskLabel="Add doc"
        inputPlaceholder="Doc name"
        onInactiveActivate={openAddDocMenu}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Add doc' }))

    expect(openAddDocMenu).toHaveBeenCalledTimes(1)
    expect(openAddDocMenu.mock.calls[0]?.[0]).toBeInstanceOf(HTMLElement)
    expect(screen.queryByPlaceholderText('Doc name')).toBeNull()
  })
})
