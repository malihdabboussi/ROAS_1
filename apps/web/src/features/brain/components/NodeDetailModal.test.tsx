import { Profiler } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { BrainMemory } from '../types'
import NodeDetailModal from './NodeDetailModal'

const mocks = vi.hoisted(() => ({
  backendGet: vi.fn(),
  deleteBrainMemory: vi.fn(),
  deleteBrainSnapshot: vi.fn(),
  deleteCampaignKnowledgeNode: vi.fn(),
  deleteSkEntry: vi.fn(),
  deleteSkSource: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  transferBrainNode: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: {
    error: mocks.toastError,
    success: mocks.toastSuccess,
  },
}))

vi.mock('@/features/brain/services/brain.service', () => ({
  deleteBrainMemory: mocks.deleteBrainMemory,
  deleteBrainSnapshot: mocks.deleteBrainSnapshot,
  transferBrainNode: mocks.transferBrainNode,
}))

vi.mock('../services/brain.service', () => ({
  deleteBrainMemory: mocks.deleteBrainMemory,
  deleteBrainSnapshot: mocks.deleteBrainSnapshot,
  transferBrainNode: mocks.transferBrainNode,
}))

vi.mock('../services/sk.service', () => ({
  deleteSkEntry: mocks.deleteSkEntry,
  deleteSkSource: mocks.deleteSkSource,
}))

vi.mock('@/lib/api/backend-client', () => ({
  backendGet: mocks.backendGet,
}))

vi.mock('@/lib/campaigns', () => ({
  deleteCampaignKnowledgeNode: mocks.deleteCampaignKnowledgeNode,
}))

vi.mock('@/lib/utils/sanitize-user-error', () => ({
  sanitizeUserError: (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback,
}))

function memoryNode(overrides: Partial<BrainMemory> = {}): BrainMemory {
  return {
    id: 'memory-1',
    content: 'A useful launch memory.',
    memory_type: 'fact',
    source_type: 'notes',
    significance: 0.8,
    confidence: 0.9,
    tags: ['launch'],
    recalled_count: 0,
    created_at: '2026-06-01T00:00:00.000Z',
    updated_at: '2026-06-01T00:00:00.000Z',
    node_type: 'memory',
    ...overrides,
  }
}

const scopeOptions = [
  {
    id: 'user',
    label: 'User Brain',
    scopeType: 'user' as const,
    agentId: null,
  },
  {
    id: 'agent:atlas',
    label: 'Atlas Brain',
    scopeType: 'agent' as const,
    agentId: 'atlas',
  },
  {
    id: 'campaign:launch',
    label: 'Launch Campaign',
    scopeType: 'campaign' as const,
    agentId: null,
    campaignId: 'campaign-1',
  },
]

function renderNodeDetailModal(overrides: Partial<Parameters<typeof NodeDetailModal>[0]> = {}) {
  let commitCount = 0
  const onClose = vi.fn()
  const onDeleted = vi.fn()
  const props = {
    agentId: null,
    campaignId: null,
    connectedNodes: [memoryNode({ id: 'connected-1' })],
    currentScopeId: 'user',
    node: memoryNode(),
    onClose,
    onDeleted,
    scopeOptions,
    scopeType: 'user' as const,
    ...overrides,
  }

  return {
    ...render(
      <Profiler id="node-detail-modal" onRender={() => commitCount++}>
        <NodeDetailModal {...props} />
      </Profiler>,
    ),
    getCommitCount: () => commitCount,
    onClose,
    onDeleted,
  }
}

describe('NodeDetailModal', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('renders memory body media, metrics, emotional metadata, and source details without render churn', () => {
    const { container, getCommitCount } = renderNodeDetailModal({
      node: memoryNode({
        agent_id: 'atlas',
        confidence: 0.74,
        content: 'Launch call proved the offer message.',
        created_at: '2026-06-05T10:15:00.000Z',
        emotional_intensity: 0.6,
        emotional_valence: 0.4,
        media_type: 'image',
        media_url: 'https://cdn.example.com/launch.png',
        source_emotion: 'confidence',
        source_title: 'Product call',
        speaker: 'Sefi',
        speaker_intent: 'decide positioning',
        tags: ['launch', 'positioning'],
      }),
    })

    expect(screen.getByText('Launch call proved the offer message.')).toBeTruthy()
    expect(screen.getByAltText('Product call')).toBeTruthy()
    expect(screen.getByText('Significance')).toBeTruthy()
    expect(screen.getByText('Confidence')).toBeTruthy()
    expect(screen.getByText('74%')).toBeTruthy()
    expect(screen.getByText('Sefi')).toBeTruthy()
    expect(screen.getByText('atlas')).toBeTruthy()
    expect(screen.getByText('confidence')).toBeTruthy()
    expect(screen.getByText('+0.4')).toBeTruthy()
    expect(screen.getByText('decide positioning')).toBeTruthy()
    expect(screen.getByText('launch')).toBeTruthy()
    expect(screen.getByText('positioning')).toBeTruthy()
    expect(screen.getByText('Product call')).toBeTruthy()
    expect(container.querySelector('img')?.getAttribute('src')).toBe(
      'https://cdn.example.com/launch.png',
    )
    expect(getCommitCount()).toBeLessThan(8)
  })

  it('resolves UUID speakers through the profile API without render churn', async () => {
    mocks.backendGet.mockResolvedValue({
      profile: {
        full_name: 'Sefi Levi',
        email: 'sefi@example.com',
        avatar_url: null,
      },
    })

    const { getCommitCount } = renderNodeDetailModal({
      node: memoryNode({
        content: 'A memory with a profile-backed speaker.',
        speaker: '11111111-1111-1111-1111-111111111111',
      }),
    })

    await waitFor(() => {
      expect(screen.getByText('Sefi Levi')).toBeTruthy()
    })
    expect(mocks.backendGet).toHaveBeenCalledWith(
      '/api/profile/11111111-1111-1111-1111-111111111111',
    )
    expect(getCommitCount()).toBeLessThan(10)
  })

  it('renders indexed knowledge source details without render churn', () => {
    const { getCommitCount } = renderNodeDetailModal({
      node: memoryNode({
        chunk_count: 12,
        content: 'Indexed source body.',
        content_hash: 'abcdef1234567890',
        indexed_at: '2026-06-06T12:00:00.000Z',
        knowledge_scope: 'campaign',
        knowledge_source_type: 'channel_message',
        name: 'Launch channel message',
        node_type: 'knowledge_source',
        parent_id: 'channel-1',
        parent_type: 'channel',
        retrieve_via: { action: 'read_channel_message', data: {} },
        source_id: 'source-1',
        source_type: 'channel_message',
        source_updated_at: '2026-06-06T12:30:00.000Z',
        summary: 'Indexed channel summary.',
      }),
    })

    expect(screen.getByText('Launch channel message')).toBeTruthy()
    expect(screen.getByText('Indexed channel summary.')).toBeTruthy()
    expect(screen.getByText('Channel message')).toBeTruthy()
    expect(screen.getByText('Campaign Knowledge')).toBeTruthy()
    expect(screen.getByText('source-1')).toBeTruthy()
    expect(screen.getByText('channel · channel-1')).toBeTruthy()
    expect(screen.getByText('12')).toBeTruthy()
    expect(screen.getByText('abcdef123456...')).toBeTruthy()
    expect(screen.getByText('read_channel_message')).toBeTruthy()
    expect(getCommitCount()).toBeLessThan(8)
  })

  it('renders snapshot detail fields without render churn', () => {
    const { getCommitCount } = renderNodeDetailModal({
      node: memoryNode({
        break_test: 'Try the opposite offer sequence.',
        challenge: 'Message clarity is not proven yet.',
        confidence: 0.66,
        core: 'The launch needs one sharp message.',
        emotion: { feeling: 'focus', intensity: 7 },
        filter: 'Prioritize signal over volume.',
        method: 'Interview-first synthesis.',
        moment: 'After reviewing the call.',
        name: 'Launch model',
        node_type: 'snapshot',
        one_liner: 'One message beats ten vague ones.',
        proof: 'Three users repeated the same phrase.',
        risks: 'Overfitting to one segment.',
        significance_score: 0.77,
        snapshot_type: 'Model',
        steps: ['Listen', 'Cluster', 'Decide'],
        story: 'The call revealed the real wedge.',
        trigger_pattern: 'Confusion around the offer promise.',
      }),
    })

    expect(screen.getByText('Launch model')).toBeTruthy()
    expect(screen.getByText('The launch needs one sharp message.')).toBeTruthy()
    expect(screen.getByText('One message beats ten vague ones.')).toBeTruthy()
    expect(screen.getByText('The call revealed the real wedge.')).toBeTruthy()
    expect(screen.getByText('focus (7/10)')).toBeTruthy()
    expect(screen.getByText(/Listen\s+Cluster\s+Decide/)).toBeTruthy()
    expect(screen.getByText('Confidence')).toBeTruthy()
    expect(screen.getByText('Significance')).toBeTruthy()
    expect(getCommitCount()).toBeLessThan(8)
  })

  it('renders structured knowledge entry and source details without render churn', () => {
    const entry = renderNodeDetailModal({
      node: memoryNode({
        confidence: 0.88,
        content: 'Choose the smallest verified move.',
        domain: 'strategy',
        entry_type: 'principle',
        media_type: 'pdf',
        media_url: 'https://cdn.example.com/principle.pdf',
        name: 'Decision principle',
        node_type: 'sk_entry',
      }),
    })

    expect(screen.getByText('Decision principle')).toBeTruthy()
    expect(screen.getByText('Choose the smallest verified move.')).toBeTruthy()
    expect(screen.getByRole('link', { name: /Open PDF/i }).getAttribute('href')).toBe(
      'https://cdn.example.com/principle.pdf',
    )
    expect(screen.getByText('principle')).toBeTruthy()
    expect(screen.getByText('strategy')).toBeTruthy()
    expect(screen.getByText('88%')).toBeTruthy()
    expect(entry.getCommitCount()).toBeLessThan(8)
    cleanup()

    const source = renderNodeDetailModal({
      node: memoryNode({
        content: 'Uploaded source',
        domain: 'operations',
        node_type: 'sk_source',
        source_title: 'Source title',
        source_type: 'manual',
      }),
    })

    expect(screen.getByText('Uploaded source')).toBeTruthy()
    expect(screen.getByText('manual')).toBeTruthy()
    expect(screen.getByText('operations')).toBeTruthy()
    expect(source.getCommitCount()).toBeLessThan(8)
  })

  it('deletes a memory node through the confirmation dialog', async () => {
    mocks.deleteBrainMemory.mockResolvedValue({ success: true })
    const { container, onClose, onDeleted } = renderNodeDetailModal()

    expect(screen.getByText('A useful launch memory.')).toBeTruthy()

    const headerButtons = container.querySelectorAll('button')
    const deleteButton = headerButtons[2]
    expect(deleteButton).toBeTruthy()
    fireEvent.click(deleteButton!)

    expect(screen.getByText('Delete Memory')).toBeTruthy()
    const deleteDialog = screen.getByRole('dialog', { name: 'Confirm delete' })
    expect(deleteDialog.getAttribute('aria-describedby')).toBe(
      screen.getByText(/permanently delete this memory/).id,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => {
      expect(mocks.deleteBrainMemory).toHaveBeenCalledWith('memory-1')
    })
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Memory deleted.')
    expect(onDeleted).toHaveBeenCalledWith('memory-1')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('copies a memory node to a selected target brain without closing the source panel', async () => {
    mocks.transferBrainNode.mockResolvedValue({ success: true })
    const { container, onClose, onDeleted } = renderNodeDetailModal()

    const headerButtons = container.querySelectorAll('button')
    const copyButton = headerButtons[1]
    expect(copyButton).toBeTruthy()
    fireEvent.click(copyButton!)

    expect(screen.getByText('COPY TO')).toBeTruthy()
    const copyDialog = screen.getByRole('dialog', { name: 'Copy to' })
    expect(copyDialog.getAttribute('aria-describedby')).toBe(
      screen.getByText(/copy this item to the selected brain/).id,
    )
    await waitFor(() => {
      expect(screen.getByText('Atlas Brain')).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('button', { name: /Atlas Brain/i }))
    fireEvent.click(screen.getByText('Launch Campaign'))
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }))

    await waitFor(() => {
      expect(mocks.transferBrainNode).toHaveBeenCalledWith({
        operation: 'copy',
        node_type: 'memory',
        node_id: 'memory-1',
        source_scope: { type: 'user' },
        target_scope: { type: 'campaign', campaign_id: 'campaign-1' },
        connected_node_ids: ['connected-1'],
        source_type: 'notes',
        source_id: null,
        source_title: 'A useful launch memory.',
      })
    })
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Copied to target brain.')
    expect(onDeleted).toHaveBeenCalledWith('memory-1')
    expect(onClose).not.toHaveBeenCalled()
  })
})
