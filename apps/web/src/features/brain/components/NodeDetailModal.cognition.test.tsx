import { Profiler } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
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

function renderNodeDetailModal(node: BrainMemory) {
  let commitCount = 0
  return {
    ...render(
      <Profiler id="node-detail-modal-cognition" onRender={() => commitCount++}>
        <NodeDetailModal node={node} onClose={vi.fn()} onDeleted={vi.fn()} />
      </Profiler>,
    ),
    getCommitCount: () => commitCount,
  }
}

describe('NodeDetailModal cognition sections', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('renders company object and signal details without render churn', () => {
    const object = renderNodeDetailModal(
      memoryNode({
        confidence: 0.91,
        content: 'The team should choose evidence over speed.',
        description: 'Use customer signal before expanding the offer.',
        node_type: 'company_object',
        object_type: 'belief',
        source_signal_ids: ['signal-1', 'signal-2'],
        source_title: 'Evidence-first belief',
        status: 'active',
      }),
    )

    expect(screen.getByText('Evidence-first belief')).toBeTruthy()
    expect(screen.getByText('Use customer signal before expanding the offer.')).toBeTruthy()
    expect(screen.getByText('91%')).toBeTruthy()
    expect(screen.getByText('Operating Belief')).toBeTruthy()
    expect(screen.getByText('active')).toBeTruthy()
    expect(screen.getByText('2')).toBeTruthy()
    expect(object.getCommitCount()).toBeLessThan(8)
    cleanup()

    const signal = renderNodeDetailModal(
      memoryNode({
        confidence: 0.55,
        content: 'Three customers asked for the same onboarding proof.',
        node_type: 'company_signal',
        signal_type: 'customer_interview',
        status: 'pending_review',
      }),
    )

    expect(screen.getByText('Company signal')).toBeTruthy()
    expect(screen.getByText('Three customers asked for the same onboarding proof.')).toBeTruthy()
    expect(screen.getByText('55%')).toBeTruthy()
    expect(screen.getByText('customer_interview')).toBeTruthy()
    expect(screen.getByText('pending_review')).toBeTruthy()
    expect(signal.getCommitCount()).toBeLessThan(8)
  })

  it('renders belief perspective and experience details without render churn', () => {
    const belief = renderNodeDetailModal(
      memoryNode({
        belief_status: 'active',
        confidence: 0.82,
        description: 'Proof should precede scale.',
        node_type: 'belief',
        pattern_name: 'Proof before scale',
        supporting_memories: ['memory-1', 'memory-2', 'memory-3'],
      }),
    )

    expect(screen.getByText('Proof before scale')).toBeTruthy()
    expect(screen.getByText('Proof should precede scale.')).toBeTruthy()
    expect(screen.getByText('82%')).toBeTruthy()
    expect(screen.getByText('active')).toBeTruthy()
    expect(screen.getByText('3')).toBeTruthy()
    expect(belief.getCommitCount()).toBeLessThan(8)
    cleanup()

    const perspective = renderNodeDetailModal(
      memoryNode({
        belief_ids: ['belief-1', 'belief-2'],
        blind_spots: 'May ignore distribution constraints.',
        confidence: 0.68,
        description: 'The company sees onboarding as the proof layer.',
        influence_areas: ['pricing_strategy', 'quality'],
        node_type: 'perspective',
        pattern_name: 'Onboarding as proof',
        perspective_status: 'shifting',
      }),
    )

    expect(screen.getByText('Onboarding as proof')).toBeTruthy()
    expect(screen.getByText('The company sees onboarding as the proof layer.')).toBeTruthy()
    expect(screen.getByText('68%')).toBeTruthy()
    expect(screen.getByText('shifting')).toBeTruthy()
    expect(screen.getByText('pricing strategy')).toBeTruthy()
    expect(screen.getByText('quality')).toBeTruthy()
    expect(screen.getByText('May ignore distribution constraints.')).toBeTruthy()
    expect(perspective.getCommitCount()).toBeLessThan(8)
    cleanup()

    const experience = renderNodeDetailModal(
      memoryNode({
        agent_id: 'atlas',
        content: 'Launch interview source',
        memory_count: 4,
        node_type: 'experience',
        source_type: 'conversation',
      }),
    )

    expect(screen.getByText('Launch interview source')).toBeTruthy()
    expect(screen.getByText('Chat with agent')).toBeTruthy()
    expect(screen.getByText('atlas')).toBeTruthy()
    expect(screen.getByText('4')).toBeTruthy()
    expect(experience.getCommitCount()).toBeLessThan(8)
  })
})
