import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AllTasksScopeFilters } from './AllTasksScopeFilters'

afterEach(cleanup)

describe('AllTasksScopeFilters', () => {
  it('exposes clear selected states for task scope', () => {
    const onScopeChange = vi.fn()

    render(
      <AllTasksScopeFilters
        scope="my"
        programId=""
        campaignId=""
        programs={[]}
        campaigns={[]}
        onScopeChange={onScopeChange}
        onProgramChange={vi.fn()}
        onCampaignChange={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Assigned to me' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    fireEvent.click(screen.getByRole('button', { name: 'All Tasks' }))
    expect(onScopeChange).toHaveBeenCalledWith('all')
  })

  it('renders named program and campaign selectors', () => {
    render(
      <AllTasksScopeFilters
        scope="all"
        programId=""
        campaignId=""
        programs={[{ id: 'program-1', name: 'Clients' }]}
        campaigns={[{ id: 'campaign-1', name: 'Impact' }]}
        onScopeChange={vi.fn()}
        onProgramChange={vi.fn()}
        onCampaignChange={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Filter by program' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Filter by campaign' })).toBeInTheDocument()
  })
})
