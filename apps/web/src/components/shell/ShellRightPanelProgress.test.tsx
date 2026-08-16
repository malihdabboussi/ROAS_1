import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ShellRightPanelProgress } from './ShellRightPanelProgress'

const mocks = vi.hoisted(() => ({ fetchSubtasks: vi.fn(), fetchMissionById: vi.fn() }))

vi.mock('@/lib/missions', async () => {
  const actual = await vi.importActual<typeof import('@/lib/missions/subtask-status')>(
    '@/lib/missions/subtask-status',
  )
  return {
    ...actual,
    ...(await vi.importActual<typeof import('@/lib/missions/mission-step-title')>(
      '@/lib/missions/mission-step-title',
    )),
    fetchSubtasks: mocks.fetchSubtasks,
    fetchMissionById: mocks.fetchMissionById,
  }
})

const subtask = (over: Record<string, unknown>) => ({
  id: 'subtask-1',
  mission_id: 'mission-1',
  user_id: 'user-1',
  title: 'Draft the outline',
  status: 'pending',
  assigned_agent_key: 'writer',
  assignee_type: 'agent',
  assigned_user_id: null,
  awaiting_human_since: null,
  sla_escalate_at: null,
  sla_escalated_at: null,
  bounce_reason: null,
  sort_order: 0,
  depends_on: [],
  output: {},
  feedback: null,
  deliverable_id: null,
  scheduled_at: null,
  created_at: '2026-08-15T10:00:00Z',
  updated_at: '2026-08-15T10:00:00Z',
  ...over,
})

const missions = [{ id: 'mission-1', title: 'Webinar Fulfillment', createdAt: '2026-08-15' }]

describe('ShellRightPanelProgress', () => {
  beforeEach(() => {
    mocks.fetchMissionById.mockImplementation((id: string) =>
      Promise.resolve({ id, status: 'in_progress' }),
    )
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('numbers the steps in sort order and labels their status', async () => {
    mocks.fetchSubtasks.mockResolvedValue([
      subtask({ id: 's1', title: 'Draft the outline', status: 'done', sort_order: 0 }),
      subtask({ id: 's2', title: 'Build the deck', status: 'in_progress', sort_order: 1 }),
    ])

    render(<ShellRightPanelProgress missions={missions} />)

    const steps = await screen.findAllByRole('listitem')
    const rendered = steps.map((li) => li.textContent)
    expect(rendered.some((text) => text?.includes('1') && text.includes('Draft the outline'))).toBe(
      true,
    )
    expect(await screen.findByText('Done')).toBeInTheDocument()
    expect(screen.getByText('Working')).toBeInTheDocument()
  })

  it('marks a human gate as your turn rather than a generic status', async () => {
    mocks.fetchSubtasks.mockResolvedValue([
      subtask({
        id: 's1',
        title: 'Approve the script',
        status: 'awaiting_human',
        assignee_type: 'human',
        assigned_agent_key: null,
        assigned_user_id: 'user-1',
      }),
    ])

    render(<ShellRightPanelProgress missions={missions} />)

    // Once on the step row, once as the mission's summary count.
    await waitFor(() => expect(screen.getAllByText('Your turn').length).toBeGreaterThan(0))
  })

  it('shows a dependency-blocked step as waiting, not pending', async () => {
    mocks.fetchSubtasks.mockResolvedValue([
      subtask({ id: 's1', title: 'Write copy', status: 'pending', sort_order: 0 }),
      subtask({
        id: 's2',
        title: 'Review copy',
        status: 'pending',
        sort_order: 1,
        depends_on: ['s1'],
      }),
    ])

    render(<ShellRightPanelProgress missions={missions} />)

    expect(await screen.findByText('Waiting')).toBeInTheDocument()
    expect(screen.getByText('Pending')).toBeInTheDocument()
  })

  it('fetches steps only for the mission that is expanded', async () => {
    mocks.fetchSubtasks.mockResolvedValue([])

    render(
      <ShellRightPanelProgress
        missions={[
          { id: 'mission-1', title: 'First', createdAt: '2026-08-15' },
          { id: 'mission-2', title: 'Second', createdAt: '2026-08-14' },
        ]}
      />,
    )

    await waitFor(() => expect(mocks.fetchSubtasks).toHaveBeenCalledWith('mission-1'))
    expect(mocks.fetchSubtasks).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: /Second/ }))

    await waitFor(() => expect(mocks.fetchSubtasks).toHaveBeenCalledWith('mission-2'))
  })

  it('reports a failed step load instead of rendering an empty mission', async () => {
    mocks.fetchSubtasks.mockRejectedValue(new Error('boom'))

    render(<ShellRightPanelProgress missions={missions} />)

    expect(await screen.findByText('Steps could not be loaded.')).toBeInTheDocument()
  })

  it('counts completed steps against the total', async () => {
    mocks.fetchSubtasks.mockResolvedValue([
      subtask({ id: 's1', status: 'done' }),
      subtask({ id: 's2', status: 'done' }),
      subtask({ id: 's3', status: 'pending' }),
    ])

    render(<ShellRightPanelProgress missions={missions} />)

    const trigger = await screen.findByRole('button', { name: /Webinar Fulfillment/ })
    await waitFor(() => expect(within(trigger).getByText('2/3')).toBeInTheDocument())
  })

  it('marks a human gate before it starts blocking', async () => {
    mocks.fetchSubtasks.mockResolvedValue([
      subtask({ id: 's1', title: 'Audit performance', status: 'pending', sort_order: 0 }),
      subtask({
        id: 's2',
        title: 'Gate 1 - Approve optimization actions',
        status: 'pending',
        sort_order: 1,
        depends_on: ['s1'],
        assignee_type: 'human',
        assigned_agent_key: null,
        assigned_user_id: 'user-1',
      }),
    ])

    render(<ShellRightPanelProgress missions={missions} />)

    // The gate is still upstream of its dependency, so it is not "Your turn"
    // yet — but a plan is only useful if you can see where it will stop for
    // you before it gets there.
    const gate = await screen.findByRole('img', { name: 'Needs your approval' })
    expect(gate).toBeInTheDocument()
    expect(screen.queryByText('Your turn')).not.toBeInTheDocument()
  })

  it('does not mark a completed gate as still needing approval', async () => {
    mocks.fetchSubtasks.mockResolvedValue([
      subtask({
        id: 's1',
        title: 'Gate 1 - Approve',
        status: 'done',
        assignee_type: 'human',
        assigned_agent_key: null,
        assigned_user_id: 'user-1',
      }),
    ])

    render(<ShellRightPanelProgress missions={missions} />)

    expect(await screen.findByText('Done')).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: 'Needs your approval' })).not.toBeInTheDocument()
  })

})
