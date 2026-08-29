import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchTaskRollup } from '@/lib/tasks'
import { ShellNewChatTasks } from './ShellNewChatTasks'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/lib/tasks', () => ({ fetchTaskRollup: vi.fn() }))

const mockedFetchTaskRollup = vi.mocked(fetchTaskRollup)

describe('ShellNewChatTasks', () => {
  afterEach(() => {
    cleanup()
    mockedFetchTaskRollup.mockReset()
  })

  it('shows assigned tasks from the canonical My Tasks rollup', async () => {
    mockedFetchTaskRollup.mockResolvedValue([
      {
        id: 'task-1',
        title: 'Send Curtis the revised plan',
        status: 'logged',
        due_at: null,
        assignee_user_id: 'user-1',
        assignees: [{ type: 'human', id: 'user-1' }],
        space_id: 'space-1',
        space_title: 'Black Swan Group',
        campaign_id: 'campaign-1',
        campaign_name: 'Black Swan Group',
        program_id: null,
        program_name: null,
        source_url: '/spaces?space=space-1&item=task-1',
        source: 'fathom',
        created_at: '2026-08-28T12:00:00.000Z',
        updated_at: null,
      },
    ])

    render(<ShellNewChatTasks />)

    expect(await screen.findByText('Send Curtis the revised plan')).toBeInTheDocument()
    expect(screen.getByText(/From a call/)).toBeInTheDocument()
    expect(mockedFetchTaskRollup).toHaveBeenCalledWith({ view: 'my', limit: 5 })
  })

  it('stays out of the way when there are no assigned tasks', async () => {
    mockedFetchTaskRollup.mockResolvedValue([])
    render(<ShellNewChatTasks />)

    await waitFor(() => expect(mockedFetchTaskRollup).toHaveBeenCalled())
    expect(screen.queryByText('In your court')).toBeNull()
  })
})
