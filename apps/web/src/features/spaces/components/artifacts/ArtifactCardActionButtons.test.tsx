import { createRef } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ArtifactListRow } from './artifact-display'
import { ArtifactCardActionButtons } from './ArtifactCardActionButtons'

afterEach(() => {
  cleanup()
})

const row: ArtifactListRow = {
  id: 'artifact-1',
  title: 'Artifact title',
  raw: {},
}

describe('ArtifactCardActionButtons', () => {
  it('toggles menu state and clears pointer position for a menu action', () => {
    const setPointer = vi.fn()
    const setOpen = vi.fn()

    render(
      <ArtifactCardActionButtons
        row={row}
        onOpenFull={vi.fn()}
        menus={[
          {
            key: 'offer',
            label: 'Offer options',
            open: false,
            anchorRef: createRef<HTMLButtonElement>(),
            setPointer,
            setOpen,
          },
        ]}
      />,
    )

    fireEvent.click(screen.getByLabelText('Offer options'))

    expect(setPointer).toHaveBeenCalledWith(null)
    expect(setOpen).toHaveBeenCalledWith(expect.any(Function))
    expect(setOpen.mock.calls[0]?.[0](false)).toBe(true)
  })

  it('delegates full view opening with the row payload', () => {
    const onOpenFull = vi.fn()

    render(<ArtifactCardActionButtons row={row} onOpenFull={onOpenFull} menus={[]} />)

    fireEvent.click(screen.getByLabelText('Open full view'))

    expect(onOpenFull).toHaveBeenCalledTimes(1)
    expect(onOpenFull.mock.calls[0]?.[0]).toBe(row)
  })
})
