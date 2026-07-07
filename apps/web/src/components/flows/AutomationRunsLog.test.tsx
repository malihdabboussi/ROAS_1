import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchAutomationRuns } from '@/lib/flows/automation-runs-api'
import { AutomationRunsLog } from './AutomationRunsLog'

type RealtimeHandler = () => void

type ChannelMock = {
  on: ReturnType<typeof vi.fn>
  subscribe: ReturnType<typeof vi.fn>
}

const mocks = vi.hoisted(() => ({
  channel: vi.fn(),
  handlers: new Map<string, RealtimeHandler>(),
  lastChannel: null as ChannelMock | null,
  removeChannel: vi.fn(),
}))

vi.mock('@/lib/flows/automation-runs-api', () => ({
  fetchAutomationRuns: vi.fn(),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    channel: mocks.channel,
    removeChannel: mocks.removeChannel,
  }),
}))

function createChannelMock(): ChannelMock {
  const channel: ChannelMock = {
    on: vi.fn((_event, config: { table?: string }, handler: RealtimeHandler) => {
      if (config.table) mocks.handlers.set(config.table, handler)
      return channel
    }),
    subscribe: vi.fn(() => channel),
  }
  return channel
}

function buildRun(overrides: Partial<Awaited<ReturnType<typeof fetchAutomationRuns>>[number]> = {}) {
  return {
    id: 'run-1',
    space_id: 'space-1',
    item_id: 'item-1',
    automation_id: 'automation-1',
    trigger_event: { type: 'task_created' },
    actions_executed: [{ type: 'add_comment' }],
    status: 'success' as const,
    linked_mission_id: null,
    error: null,
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

describe('AutomationRunsLog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.handlers.clear()
    mocks.lastChannel = null
    mocks.channel.mockImplementation(() => {
      mocks.lastChannel = createChannelMock()
      return mocks.lastChannel
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('renders scoped history toolbar and campaign/space metadata', async () => {
    vi.mocked(fetchAutomationRuns).mockResolvedValue([buildRun()])

    render(
      <AutomationRunsLog
        open
        campaignId={null}
        spaceId={null}
        automationNames={{ 'automation-1': 'Daily digest' }}
        automationMeta={{
          'automation-1': {
            campaignName: 'Launch campaign',
            flowName: 'Daily digest',
            spaceName: 'Content space',
          },
        }}
      />,
    )

    await waitFor(() => {
      expect(screen.getByText('Daily digest')).toBeTruthy()
    })

    expect(screen.getByText('Launch campaign')).toBeTruthy()
    expect(screen.getByText('Content space')).toBeTruthy()
    expect(screen.getByLabelText('Group run history')).toBeTruthy()
    expect(screen.getByLabelText('Filter by run status')).toBeTruthy()
    expect(screen.getByLabelText('All time')).toBeTruthy()
    fireEvent.click(screen.getByLabelText('All time'))
    expect(screen.getByText('Last 24 hours')).toBeTruthy()
    expect(screen.getByText('This quarter')).toBeTruthy()

    fireEvent.click(screen.getByLabelText('Search run history'))
    fireEvent.change(screen.getByPlaceholderText('Search runs...'), {
      target: { value: 'no match' },
    })

    expect(screen.getByText('No run history matches these filters.')).toBeTruthy()
  })

  it('reloads scoped run history when an automation run changes', async () => {
    vi.mocked(fetchAutomationRuns).mockResolvedValueOnce([]).mockResolvedValueOnce([
      buildRun({ id: 'run-2' }),
    ])

    render(
      <AutomationRunsLog
        open
        spaceId="space-1"
        automationNames={{ 'automation-1': 'Daily digest' }}
      />,
    )

    await waitFor(() => expect(fetchAutomationRuns).toHaveBeenCalledTimes(1))
    expect(mocks.handlers.has('space_automation_runs')).toBe(true)

    await act(async () => {
      mocks.handlers.get('space_automation_runs')?.()
      await new Promise((resolve) => setTimeout(resolve, 800))
    })

    await waitFor(() => expect(fetchAutomationRuns).toHaveBeenCalledTimes(2))
    expect(await screen.findByText('Daily digest')).toBeTruthy()
  })
})
