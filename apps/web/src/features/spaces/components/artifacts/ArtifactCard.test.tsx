import type { HTMLAttributes } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ArtifactListRow } from './artifact-display'
import { ArtifactCard } from './ArtifactCard'

vi.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      layout: _layout,
      transition: _transition,
      ...props
    }: HTMLAttributes<HTMLDivElement> & {
      layout?: boolean
      transition?: unknown
    }) => <div {...props}>{children}</div>,
  },
}))

vi.mock('./ArtifactCardBody', () => ({
  ArtifactCardBody: ({ row }: { row: ArtifactListRow }) => (
    <span data-testid="artifact-card-body">{row.title}</span>
  ),
}))

vi.mock('./ArtifactCardDropdowns', () => ({
  ArtifactCardDropdowns: () => null,
}))

afterEach(() => {
  cleanup()
})

const row: ArtifactListRow = {
  id: 'offer-1',
  title: 'Offer artifact',
  raw: {
    id: 'offer-1',
    name: 'Offer artifact',
    campaign_id: 'campaign-1',
  },
}

describe('ArtifactCard', () => {
  it('delegates body open and full-view actions with the row payload', () => {
    const onOpen = vi.fn()
    const onOpenFull = vi.fn()

    render(
      <ArtifactCard
        row={row}
        selected={false}
        onOpen={onOpen}
        onOpenFull={onOpenFull}
        previewType="offer"
        socialPostCardFieldIds={[]}
        funnelCardFieldIds={[]}
        sequenceCardFieldIds={[]}
        presentationsCardFieldIds={[]}
        avatarsCardFieldIds={[]}
        adCardFieldIds={[]}
        formCardFieldIds={[]}
        parentCampaignId="campaign-1"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Offer artifact' }))
    expect(onOpen).toHaveBeenCalledWith(row)

    fireEvent.click(screen.getByLabelText('Open full view'))
    expect(onOpenFull).toHaveBeenCalledTimes(1)
    expect(onOpenFull.mock.calls[0]?.[0]).toBe(row)
  })
})
