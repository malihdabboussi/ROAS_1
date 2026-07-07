import { createRef } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ArtifactListRow } from './artifact-display'
import { ArtifactCardDropdowns } from './ArtifactCardDropdowns'

vi.mock('./ad/AdMenuDropdown', () => ({
  AdMenuDropdown: () => null,
}))

vi.mock('./avatar/AvatarMenuDropdown', () => ({
  AvatarMenuDropdown: () => null,
}))

vi.mock('./email/EmailMenuDropdown', () => ({
  EmailMenuDropdown: () => null,
}))

vi.mock('./form/FormMenuDropdown', () => ({
  FormMenuDropdown: () => null,
}))

vi.mock('./funnel/FunnelMenuDropdown', () => ({
  FunnelMenuDropdown: () => null,
}))

vi.mock('./offer/OfferMenuDropdown', () => ({
  OfferMenuDropdown: ({
    offer,
    onClose,
    onOpenFullView,
  }: {
    offer: { id: string }
    onClose: () => void
    onOpenFullView?: () => void
  }) => (
    <div data-testid="offer-menu">
      <span>{offer.id}</span>
      <button type="button" onClick={onClose}>
        close offer
      </button>
      <button type="button" onClick={onOpenFullView}>
        open offer full
      </button>
    </div>
  ),
}))

vi.mock('./presentation/PresentationMenuDropdown', () => ({
  PresentationMenuDropdown: () => null,
}))

vi.mock('./sequence/SequenceMenuDropdown', () => ({
  SequenceMenuDropdown: () => null,
}))

vi.mock('./social-post/SocialPostMenuDropdown', () => ({
  SocialPostMenuDropdown: () => null,
}))

afterEach(() => {
  cleanup()
})

const row: ArtifactListRow = {
  id: 'artifact-1',
  title: 'Artifact title',
  raw: {},
}

describe('ArtifactCardDropdowns', () => {
  it('renders an open offer dropdown and delegates close/full-view actions', () => {
    const setOpen = vi.fn()
    const setPointer = vi.fn()
    const onOpenFull = vi.fn()

    render(
      <ArtifactCardDropdowns
        row={row}
        onOpenFull={onOpenFull}
        offer={{
          target: { id: 'offer-1', name: 'Offer', campaign_id: 'campaign-1' },
          open: true,
          anchorRef: createRef<HTMLButtonElement>(),
          pointerPosition: null,
          setOpen,
          setPointer,
        }}
      />,
    )

    expect(screen.getByTestId('offer-menu')).toBeTruthy()
    expect(screen.getByText('offer-1')).toBeTruthy()

    fireEvent.click(screen.getByText('close offer'))
    expect(setOpen).toHaveBeenCalledWith(false)
    expect(setPointer).toHaveBeenCalledWith(null)

    fireEvent.click(screen.getByText('open offer full'))
    expect(onOpenFull).toHaveBeenCalledTimes(1)
    expect(onOpenFull.mock.calls[0]?.[0]).toBe(row)
  })
})
