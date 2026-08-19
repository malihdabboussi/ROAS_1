import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useMeetingSpaceStatusField } from './use-meeting-space-status-field'

const fetchSpaceById = vi.fn()
vi.mock('@/lib/spaces', () => ({
  fetchSpaceById: (...args: unknown[]) => fetchSpaceById(...args),
}))

function Probe({ spaceId }: { spaceId: string }) {
  const field = useMeetingSpaceStatusField(spaceId)
  return <p>{field?.options?.map((option) => option.label).join(',') || 'none'}</p>
}

describe('useMeetingSpaceStatusField', () => {
  afterEach(() => {
    cleanup()
    fetchSpaceById.mockReset()
  })

  it('loads the space Status field options', async () => {
    fetchSpaceById.mockResolvedValue({
      schema: {
        fields: [
          {
            id: 'status',
            name: 'Status',
            type: 'select',
            options: [{ id: 'logged', label: 'To action', group: 'not_started' }],
          },
        ],
      },
    })
    render(<Probe spaceId="space-1" />)
    expect(await screen.findByText('To action')).toBeInTheDocument()
    expect(fetchSpaceById).toHaveBeenCalledWith('space-1')
  })
})
