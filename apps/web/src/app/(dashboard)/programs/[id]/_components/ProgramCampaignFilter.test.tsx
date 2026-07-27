import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ProgramCampaignFilter } from './ProgramCampaignFilter'

describe('ProgramCampaignFilter', () => {
  afterEach(cleanup)

  it('uses the app select and exposes the current filter', () => {
    const onChange = vi.fn()
    render(
      <ProgramCampaignFilter
        campaignId=""
        campaigns={[
          {
            id: 'campaign-1',
            name: 'Launch',
          },
        ]}
        onChange={onChange}
      />,
    )

    const trigger = screen.getByRole('button', { name: 'All campaigns' })
    expect(trigger).toHaveClass('input-glass')
    fireEvent.click(trigger)
    fireEvent.click(screen.getByRole('button', { name: /Launch/i }))
    expect(onChange).toHaveBeenCalledWith('campaign-1')
  })
})
