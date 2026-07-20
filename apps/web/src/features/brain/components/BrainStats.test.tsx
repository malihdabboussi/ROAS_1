import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { BrainHealthData } from '../types'
import BrainStats from './BrainStats'

afterEach(cleanup)

const COMPANY_HEALTH: BrainHealthData = {
  status: 'ok',
  total_memories: 0,
  total_connections: 0,
  embedding_queue: 0,
  last_capture: '2026-07-20T09:00:00.000Z',
  last_recall: null,
  experience_sources: 60,
}

describe('BrainStats', () => {
  it('uses Company Cortex vocabulary and omits unrelated memory cognition counters', () => {
    render(
      <BrainStats
        health={COMPANY_HEALTH}
        beliefCount={0}
        perspectiveCount={0}
        queueCount={0}
        variant="company"
      />,
    )

    expect(screen.getByText('Objects')).toBeTruthy()
    expect(screen.getByText('Relationships')).toBeTruthy()
    expect(screen.getByText('Signals')).toBeTruthy()
    expect(screen.getByText('60')).toBeTruthy()
    expect(screen.getByText('Last dream')).toBeTruthy()
    expect(screen.queryByText('Memories')).toBeNull()
    expect(screen.queryByText('Beliefs')).toBeNull()
    expect(screen.queryByText('Perspectives')).toBeNull()
    expect(screen.queryByText('Queue')).toBeNull()
  })
})
