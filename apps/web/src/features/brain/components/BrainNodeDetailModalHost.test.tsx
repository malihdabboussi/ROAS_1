import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { BrainScopeNavOption } from '../hooks/use-brain-scope-nav-options'
import type { BrainMemory } from '../types'
import { BrainNodeDetailModalHost } from './BrainNodeDetailModalHost'

vi.mock('./NodeDetailModal', () => ({
  default: ({
    currentScopeId,
    onClose,
    onDeleted,
    scopeOptions,
  }: {
    currentScopeId?: string | null
    onClose: () => void
    onDeleted?: (nodeId: string) => void
    scopeOptions?: Array<{ id: string; label: string }>
  }) => (
    <div data-testid="node-detail-modal">
      <div data-testid="current-scope">{currentScopeId}</div>
      <div data-testid="target-scopes">{scopeOptions?.map((option) => option.id).join(',')}</div>
      <button type="button" onClick={() => onDeleted?.('node-1')}>
        Delete node
      </button>
      <button type="button" onClick={onClose}>
        Close
      </button>
    </div>
  ),
}))

function memoryNode(overrides: Partial<BrainMemory> = {}): BrainMemory {
  return {
    id: 'node-1',
    content: 'Memory node',
    memory_type: 'fact',
    source_type: 'note',
    significance: 1,
    confidence: 1,
    tags: [],
    recalled_count: 0,
    created_at: '2026-06-01T00:00:00.000Z',
    updated_at: '2026-06-01T00:00:00.000Z',
    node_type: 'memory',
    name: 'Memory node',
    ...overrides,
  }
}

function scopeOption(overrides: Partial<BrainScopeNavOption>): BrainScopeNavOption {
  return {
    id: 'user',
    label: 'User Brain',
    agentId: null,
    brainId: 'brain-user',
    scopeType: 'user',
    ...overrides,
  }
}

function renderHost(overrides: Partial<Parameters<typeof BrainNodeDetailModalHost>[0]> = {}) {
  const loadGraph = vi.fn()
  const refreshCampaignGraph = vi.fn()
  const refreshKnowledgeGraph = vi.fn()
  const selectNode = vi.fn()
  const props = {
    connectedNodes: [memoryNode({ id: 'connected-1' })],
    isCampaignScope: false,
    isKnowledgeScope: false,
    loadGraph,
    refreshCampaignGraph,
    refreshKnowledgeGraph,
    scopeOptions: [
      scopeOption({ id: 'user', scopeType: 'user' }),
      scopeOption({ id: 'agent:atlas', agentId: 'atlas', brainId: 'brain-atlas', scopeType: 'agent' }),
      scopeOption({
        id: 'campaign:one',
        brainId: null,
        campaignId: 'campaign-1',
        scopeType: 'campaign',
      }),
      scopeOption({ id: 'shared:one', scopeType: 'shared' }),
      scopeOption({ id: 'customer', scopeType: 'customer' }),
      scopeOption({ id: 'company', scopeType: 'company' }),
      scopeOption({
        id: 'campaign:knowledge',
        brainId: null,
        campaignId: 'campaign-1',
        scopeType: 'campaign_knowledge',
      }),
    ],
    selectedAgentId: 'atlas',
    selectedNode: memoryNode(),
    selectedScope: scopeOption({ id: 'user', scopeType: 'user' }),
    selectNode,
    ...overrides,
  }

  return {
    ...render(<BrainNodeDetailModalHost {...props} />),
    loadGraph,
    refreshCampaignGraph,
    refreshKnowledgeGraph,
    selectNode,
  }
}

describe('BrainNodeDetailModalHost', () => {
  afterEach(() => {
    cleanup()
  })

  it('filters modal transfer targets to movable brain scopes and closes by clearing the selected node', () => {
    const { selectNode } = renderHost()

    expect(screen.getByTestId('current-scope').textContent).toBe('user')
    expect(screen.getByTestId('target-scopes').textContent).toBe('user,agent:atlas,campaign:one')

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))

    expect(selectNode).toHaveBeenCalledWith(null)
  })

  it('routes deletion refreshes to the active scope graph source', () => {
    const campaign = renderHost({
      isCampaignScope: true,
      selectedScope: scopeOption({
        id: 'campaign:one',
        brainId: null,
        campaignId: 'campaign-1',
        scopeType: 'campaign',
      }),
    })
    fireEvent.click(screen.getByRole('button', { name: 'Delete node' }))
    expect(campaign.refreshCampaignGraph).toHaveBeenCalledTimes(1)
    campaign.unmount()

    const knowledge = renderHost({
      isKnowledgeScope: true,
      selectedScope: scopeOption({
        id: 'campaign:knowledge',
        brainId: null,
        campaignId: 'campaign-1',
        scopeType: 'campaign_knowledge',
      }),
    })
    fireEvent.click(screen.getByRole('button', { name: 'Delete node' }))
    expect(knowledge.refreshKnowledgeGraph).toHaveBeenCalledTimes(1)
    knowledge.unmount()

    const user = renderHost()
    fireEvent.click(screen.getByRole('button', { name: 'Delete node' }))
    expect(user.loadGraph).toHaveBeenCalledWith('atlas', 'brain-user')
  })

  it('renders nothing when there is no selected node', () => {
    renderHost({ selectedNode: null })

    expect(screen.queryByTestId('node-detail-modal')).toBeNull()
  })
})
