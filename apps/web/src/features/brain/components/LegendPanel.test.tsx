import { Profiler, type HTMLAttributes, type ReactNode } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import LegendPanel from './LegendPanel'

const mocks = vi.hoisted(() => ({
  fetchSkStats: vi.fn(),
}))

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  motion: {
    div: ({
      children,
      animate: _animate,
      exit: _exit,
      initial: _initial,
      layout: _layout,
      transition: _transition,
      ...props
    }: HTMLAttributes<HTMLDivElement> & {
      animate?: unknown
      exit?: unknown
      initial?: unknown
      layout?: boolean | string
      transition?: unknown
    }) => <div {...props}>{children}</div>,
  },
}))

vi.mock('@/components/vibey/vibey-chat-orb', () => ({
  VibeyChatOrb: () => <span data-testid="knowledge-loading-orb" />,
}))

vi.mock('../services/sk.service', () => ({
  fetchSkStats: mocks.fetchSkStats,
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('LegendPanel', () => {
  beforeEach(() => {
    mocks.fetchSkStats.mockResolvedValue({
      totalEntries: 11,
      avgMastery: 0,
      domainBreakdown: { strategy: 7, finance: 4 },
    })
  })

  it('renders user brain legend sections, counts, collapse state, and settles without render churn', () => {
    let commitCount = 0

    render(
      <Profiler id="legend-panel" onRender={() => commitCount++}>
        <LegendPanel
          memoryCounts={{ fact: 2, insight: 1 }}
          snapshotCounts={{ Model: 1 }}
          experienceCount={3}
          skEntryCount={2}
          beliefCount={4}
          perspectiveCount={5}
          connections={[
            {
              id: 'connection-1',
              source_memory_id: 'memory-1',
              target_memory_id: 'memory-2',
              relationship_type: 'supports',
              strength: 0.8,
            },
            {
              id: 'connection-2',
              source_memory_id: 'memory-2',
              target_memory_id: 'memory-3',
              relationship_type: 'supports',
              strength: 0.7,
            },
          ]}
          scopeType="user"
          isAgentBrain={false}
          brainId={null}
        />
      </Profiler>,
    )

    expect(screen.getByText('Memories')).toBeTruthy()
    expect(screen.getAllByText('Fact').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Cognition')).toBeTruthy()
    expect(screen.getByText('Beliefs')).toBeTruthy()
    expect(screen.getByText('Perspectives')).toBeTruthy()
    expect(screen.getByText('Snapshots')).toBeTruthy()
    expect(screen.getByText('Experience / Source')).toBeTruthy()
    expect(screen.getByText('SK Knowledge')).toBeTruthy()
    expect(screen.getByText('Connections')).toBeTruthy()
    expect(screen.getByText('supports')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Legend' }))
    expect(screen.queryByText('Memories')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Legend' }))
    expect(screen.getByText('Memories')).toBeTruthy()
    expect(commitCount).toBeLessThan(10)
  })

  it('renders campaign domain, source, and relationship counts', () => {
    render(
      <LegendPanel
        domainCounts={{ marketing: 3, strategy: 1 }}
        sourceCounts={{ drive: 2, upload: 1 }}
        connectionCounts={{ supports: 5 }}
        scopeType="campaign"
        isAgentBrain={false}
        brainId={null}
      />,
    )

    expect(screen.getByText('Domains')).toBeTruthy()
    expect(screen.getByText('Marketing')).toBeTruthy()
    expect(screen.getByText('3')).toBeTruthy()
    expect(screen.getByText('Sources')).toBeTruthy()
    expect(screen.getByText('Google Drive')).toBeTruthy()
    expect(screen.getByText('2')).toBeTruthy()
    expect(screen.getByText('Connections')).toBeTruthy()
    expect(screen.getByText('supports')).toBeTruthy()
    expect(screen.getByText('5')).toBeTruthy()
  })

  it('loads agent knowledge stats when switching to the sources panel', async () => {
    render(
      <LegendPanel
        memoryCounts={{ concept: 2, principle: 1 }}
        skEntryCount={3}
        scopeType="agent"
        isAgentBrain
        brainId="brain-agent"
      />,
    )

    expect(screen.getByText('SK Knowledge')).toBeTruthy()
    expect(screen.getByText('Concept')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Next panel' }))

    await waitFor(() => {
      expect(mocks.fetchSkStats).toHaveBeenCalledWith('brain-agent')
    })

    expect(await screen.findByText('Total entries')).toBeTruthy()
    expect(screen.getByText('11')).toBeTruthy()
    expect(screen.getByText('Domains')).toBeTruthy()
    expect(screen.getByText('strategy')).toBeTruthy()
    expect(screen.getByText('7')).toBeTruthy()
    expect(screen.getByText('finance')).toBeTruthy()
    expect(screen.getByText('4')).toBeTruthy()
  })
})
