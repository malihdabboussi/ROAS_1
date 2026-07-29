import { describe, expect, it } from 'vitest'
import { selectDispatchableOutboxRows } from './brain-ops-outbox-dispatcher.service'
import type { OutboxRow } from './types'

function row(id: string, createdAt: string, payload: Record<string, unknown> = {}): OutboxRow {
  return {
    id,
    brain_id: 'brain-1',
    user_id: 'user-1',
    org_id: null,
    event_type: 'brain_pattern_analysis',
    dedupe_key: id,
    payload,
    attempts: 0,
    max_attempts: 3,
    created_at: createdAt,
  }
}

describe('selectDispatchableOutboxRows', () => {
  const now = new Date('2026-07-29T12:10:00.000Z')

  it('debounces automatic pattern analysis and coalesces a burst to the newest event', () => {
    const result = selectDispatchableOutboxRows(
      [row('old', '2026-07-29T12:00:00.000Z'), row('new', '2026-07-29T12:04:00.000Z')],
      now,
      5 * 60 * 1000,
      new Set(),
    )

    expect(result.dispatchable.map((candidate) => candidate.id)).toEqual(['new'])
    expect(result.coalescedIds).toEqual(['old'])
  })

  it('lets explicit manual analysis bypass the debounce window', () => {
    const result = selectDispatchableOutboxRows(
      [row('manual', '2026-07-29T12:09:59.000Z', { manual: true })],
      now,
      5 * 60 * 1000,
      new Set(),
    )

    expect(result.dispatchable.map((candidate) => candidate.id)).toEqual(['manual'])
  })

  it('preserves single-flight execution for the same brain and event', () => {
    const result = selectDispatchableOutboxRows(
      [row('next', '2026-07-29T12:00:00.000Z')],
      now,
      5 * 60 * 1000,
      new Set(['brain-1:brain_pattern_analysis']),
    )

    expect(result.dispatchable).toEqual([])
    expect(result.coalescedIds).toEqual([])
  })
})
