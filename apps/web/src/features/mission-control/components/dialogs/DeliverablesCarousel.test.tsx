import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { MissionDeliverable } from '@/lib/missions'
import { DeliverablesCarousel } from './DeliverablesCarousel'

const baseDeliverable: MissionDeliverable = {
  id: 'deliverable-base',
  mission_id: 'mission-1',
  campaign_id: 'campaign-1',
  user_id: 'user-1',
  agent_key: 'agent-1',
  type: 'offer',
  title: 'Base deliverable',
  content: null,
  file_url: null,
  file_name: null,
  file_size: null,
  mime_type: null,
  metadata: {},
  entity_id: null,
  entity_table: null,
  created_at: '2026-06-29T10:00:00.000Z',
}

const deliverables: MissionDeliverable[] = [
  {
    ...baseDeliverable,
    id: 'offer-1',
    type: 'offer',
    title: 'Launch Offer',
  },
  {
    ...baseDeliverable,
    id: 'doc-1',
    type: 'doc',
    title: 'Launch Brief',
    file_size: 2048,
    created_at: '2026-06-29T11:00:00.000Z',
  },
  {
    ...baseDeliverable,
    id: 'image-1',
    type: 'image',
    title: 'Hero Image',
    file_size: 4096,
    created_at: '2026-06-29T12:00:00.000Z',
  },
]

afterEach(() => {
  cleanup()
})

describe('DeliverablesCarousel', () => {
  it('renders grid, list, extra bucket, task chrome, and settles across rerenders', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const onSelect = vi.fn()

    const { rerender } = render(
      <DeliverablesCarousel
        deliverables={deliverables}
        onSelect={onSelect}
        taskSectionChrome
        iconBesideTitle
        headingLabel="Deliverables & media"
      />,
    )

    expect(screen.getByText('Deliverables & media')).toBeInTheDocument()
    expect(screen.getByText('3 items')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Grid view' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Launch Offer' }))
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'offer-1' }))

    fireEvent.click(screen.getByRole('button', { name: 'List view' }))
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Launch Brief')).toBeInTheDocument()
    expect(screen.getByText('2.0 KB')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Grid view' }))
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Documents and media, 2 items — open list',
      }),
    )

    await waitFor(() => {
      expect(screen.getAllByText('Documents & Media (2)').length).toBeGreaterThan(0)
    })
    fireEvent.click(screen.getByRole('button', { name: /Hero Image/ }))
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'image-1' }))

    rerender(
      <DeliverablesCarousel
        deliverables={deliverables}
        onSelect={onSelect}
        taskSectionChrome
        iconBesideTitle
        headingLabel="Updated deliverables"
      />,
    )

    expect(screen.getByText('Updated deliverables')).toBeInTheDocument()
    expect(
      consoleError.mock.calls.some((call) =>
        call.some((part) => String(part).includes('Maximum update depth')),
      ),
    ).toBe(false)
    consoleError.mockRestore()
  })
})
