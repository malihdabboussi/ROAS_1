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

  it('loads Call status options when both Call status and task Status exist', async () => {
    fetchSpaceById.mockResolvedValue({
      schema: {
        fields: [
          {
            id: 'status',
            name: 'Status',
            type: 'select',
            options: [{ id: 'needs_follow_up', label: 'Following up', group: 'active' }],
          },
          {
            id: 'call_status',
            name: 'Call status',
            type: 'select',
            options: [{ id: 'completed', label: 'Completed', group: 'done' }],
          },
        ],
      },
    })
    render(<Probe spaceId="space-1" />)
    expect(await screen.findByText('Completed')).toBeInTheDocument()
    expect(screen.queryByText('Following up')).toBeNull()
    expect(fetchSpaceById).toHaveBeenCalledWith('space-1')
  })

  it('falls back to the space Status field when Call status is missing', async () => {
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
  })
})
