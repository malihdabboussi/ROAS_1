import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useDeliverableBrainMenu } from './use-deliverable-brain-menu'

const brainMenuMocks = vi.hoisted(() => ({
  billingStatus: vi.fn(),
  enqueueCampaignKnowledgeFileImport: vi.fn(),
  enqueueSkIngest: vi.fn(),
  fetchCampaigns: vi.fn(),
  fetchMissionAgents: vi.fn(),
  rememberDocumentMemory: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}))

vi.mock('@/lib/brain', () => ({
  enqueueSkIngest: brainMenuMocks.enqueueSkIngest,
  rememberDocumentMemory: brainMenuMocks.rememberDocumentMemory,
}))

vi.mock('@/lib/agents/mission-agents-api', () => ({
  fetchMissionAgents: brainMenuMocks.fetchMissionAgents,
}))

vi.mock('@/lib/billing/billing-api', () => ({
  billingApi: {
    getAgentBrainStatus: brainMenuMocks.billingStatus,
  },
}))

vi.mock('@/lib/campaigns', () => ({
  enqueueCampaignKnowledgeFileImport: brainMenuMocks.enqueueCampaignKnowledgeFileImport,
  fetchCampaigns: brainMenuMocks.fetchCampaigns,
}))

vi.mock('sonner', () => ({
  toast: {
    error: brainMenuMocks.toastError,
    success: brainMenuMocks.toastSuccess,
  },
}))

function renderHarness() {
  let renderCount = 0

  function Harness() {
    renderCount += 1
    const menu = useDeliverableBrainMenu({
      deliverableTitle: 'Launch brief',
      effectiveContent: 'Launch content',
    })
    return (
      <div>
        <button
          ref={menu.brainButtonRef}
          type="button"
          onClick={menu.handleBrainDropdownToggle}
        >
          Toggle brain menu
        </button>
        <span data-testid="loading-state">{menu.brainsLoading ? 'loading' : 'ready'}</span>
        <span data-testid="ingesting-state">{menu.brainIngesting ? 'ingesting' : 'idle'}</span>
        {menu.brainOptions.map((option) => (
          <button key={option.id} type="button" onClick={() => menu.setConfirmBrain(option)}>
            {option.label}
          </button>
        ))}
        <button type="button" onClick={() => void menu.handleBrainIngest()}>
          Confirm ingest
        </button>
      </div>
    )
  }

  render(<Harness />)
  return { getRenderCount: () => renderCount }
}

describe('useDeliverableBrainMenu', () => {
  beforeEach(() => {
    for (const mock of Object.values(brainMenuMocks)) {
      mock.mockReset()
    }

    brainMenuMocks.fetchMissionAgents.mockResolvedValue([
      {
        id: 'system-agent',
        user_id: 'user-1',
        agent_key: 'vibey',
        name: 'Vibey',
        role: 'System',
        status: 'online',
        skills: [],
        level: 'system',
        created_at: '2026-06-28T10:45:00.000Z',
        updated_at: '2026-06-28T10:45:00.000Z',
      },
      {
        id: 'agent-1',
        user_id: 'user-1',
        agent_key: 'growth',
        name: 'Growth Agent',
        role: 'Growth',
        status: 'online',
        skills: [],
        level: 'employee',
        created_at: '2026-06-28T10:45:00.000Z',
        updated_at: '2026-06-28T10:45:00.000Z',
      },
    ])
    brainMenuMocks.fetchCampaigns.mockResolvedValue([
      {
        id: 'campaign-general',
        name: 'General',
        user_id: 'user-1',
        campaign_type: 'standard',
        status: 'active',
        config: { system_kind: 'general' },
        metrics: {},
        created_at: '2026-06-28T10:45:00.000Z',
        updated_at: '2026-06-28T10:45:00.000Z',
      },
      {
        id: 'campaign-1',
        name: 'Launch Campaign',
        user_id: 'user-1',
        campaign_type: 'standard',
        status: 'active',
        config: {},
        metrics: {},
        created_at: '2026-06-28T10:45:00.000Z',
        updated_at: '2026-06-28T10:45:00.000Z',
      },
    ])
    brainMenuMocks.billingStatus.mockResolvedValue({
      hasBrain: true,
      brainId: 'brain-growth',
    })
    brainMenuMocks.rememberDocumentMemory.mockResolvedValue(undefined)
    brainMenuMocks.enqueueCampaignKnowledgeFileImport.mockResolvedValue(undefined)
    brainMenuMocks.enqueueSkIngest.mockResolvedValue(undefined)
  })

  afterEach(() => {
    cleanup()
  })

  it('loads eligible Brain destinations and queues ingestion without render churn', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { getRenderCount } = renderHarness()

    fireEvent.click(screen.getByRole('button', { name: 'Toggle brain menu' }))

    await waitFor(() => expect(screen.getByRole('button', { name: 'Your Brain' })).toBeTruthy())

    expect(screen.getByRole('button', { name: 'Growth Agent' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Launch Campaign' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Vibey' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'General' })).toBeNull()
    expect(brainMenuMocks.fetchMissionAgents).toHaveBeenCalledTimes(1)
    expect(brainMenuMocks.fetchCampaigns).toHaveBeenCalledTimes(1)
    expect(brainMenuMocks.billingStatus).toHaveBeenCalledWith('growth')

    fireEvent.click(screen.getByRole('button', { name: 'Your Brain' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm ingest' }))

    await waitFor(() =>
      expect(brainMenuMocks.rememberDocumentMemory).toHaveBeenCalledWith({
        content: 'Launch content',
        title: 'Launch brief',
        sourceType: 'document',
      }),
    )
    expect(brainMenuMocks.toastSuccess).toHaveBeenCalledWith('Queued for ingestion into Your Brain')
    expect(screen.getByTestId('ingesting-state').textContent).toBe('idle')

    fireEvent.click(screen.getByRole('button', { name: 'Launch Campaign' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm ingest' }))

    await waitFor(() =>
      expect(brainMenuMocks.enqueueCampaignKnowledgeFileImport).toHaveBeenCalledWith({
        campaignId: 'campaign-1',
        title: 'Launch brief',
        content: 'Launch content',
        sourceType: 'upload',
      }),
    )
    expect(brainMenuMocks.toastSuccess).toHaveBeenCalledWith(
      'Queued for ingestion into Launch Campaign',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Growth Agent' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm ingest' }))

    await waitFor(() =>
      expect(brainMenuMocks.enqueueSkIngest).toHaveBeenCalledWith({
        brainId: 'brain-growth',
        text: 'Launch content',
        sourceType: 'deliverable',
        title: 'Launch brief',
      }),
    )
    expect(brainMenuMocks.toastSuccess).toHaveBeenCalledWith(
      'Queued for ingestion into Growth Agent',
    )

    const renderLoopErrors = consoleErrorSpy.mock.calls.filter(([message]) =>
      String(message).match(/maximum update depth|too many re-renders/i),
    )
    expect(renderLoopErrors).toHaveLength(0)
    expect(getRenderCount()).toBeLessThan(35)
    consoleErrorSpy.mockRestore()
  })
})
