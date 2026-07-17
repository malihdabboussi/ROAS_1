import { describe, expect, it } from 'vitest'
import {
  DEFAULT_MISSION_EXECUTION_LEASE_TIMEOUT_MS,
  DEFAULT_MISSION_EXECUTION_START_LEASE_TIMEOUT_MS,
  DEFAULT_MISSION_EXECUTION_LEASE_WRITE_MS,
  isPastMissionExecutionLease,
  shouldWriteMissionExecutionLease,
} from '../mission-execution-lease'

describe('mission execution lease', () => {
  it('expires an execution after the lease timeout', () => {
    const now = Date.parse('2026-07-16T22:00:00.000Z')
    const expiredAt = new Date(now - DEFAULT_MISSION_EXECUTION_LEASE_TIMEOUT_MS).toISOString()

    expect(isPastMissionExecutionLease(expiredAt, now)).toBe(true)
  })

  it('keeps recently renewed execution work active', () => {
    const now = Date.parse('2026-07-16T22:00:00.000Z')
    const activeAt = new Date(now - DEFAULT_MISSION_EXECUTION_LEASE_TIMEOUT_MS + 1).toISOString()

    expect(isPastMissionExecutionLease(activeAt, now)).toBe(false)
  })

  it('allows runtime warm-up longer than the active stream lease', () => {
    const now = Date.parse('2026-07-16T22:00:00.000Z')
    const activeLeaseExpiredAt = new Date(
      now - DEFAULT_MISSION_EXECUTION_LEASE_TIMEOUT_MS,
    ).toISOString()
    const startingLeaseExpiredAt = new Date(
      now - DEFAULT_MISSION_EXECUTION_START_LEASE_TIMEOUT_MS,
    ).toISOString()

    expect(isPastMissionExecutionLease(activeLeaseExpiredAt, now, undefined, 'starting')).toBe(false)
    expect(isPastMissionExecutionLease(startingLeaseExpiredAt, now, undefined, 'starting')).toBe(true)
  })

  it('allows queued work the same startup lease before recovery', () => {
    const now = Date.parse('2026-07-16T22:00:00.000Z')
    const activeLeaseExpiredAt = new Date(
      now - DEFAULT_MISSION_EXECUTION_LEASE_TIMEOUT_MS,
    ).toISOString()
    const startingLeaseExpiredAt = new Date(
      now - DEFAULT_MISSION_EXECUTION_START_LEASE_TIMEOUT_MS,
    ).toISOString()

    expect(isPastMissionExecutionLease(activeLeaseExpiredAt, now, undefined, 'queued')).toBe(false)
    expect(isPastMissionExecutionLease(startingLeaseExpiredAt, now, undefined, 'queued')).toBe(true)
  })

  it('throttles lease writes while still renewing well before expiry', () => {
    const lastWrite = 100_000

    expect(
      shouldWriteMissionExecutionLease(
        lastWrite,
        lastWrite + DEFAULT_MISSION_EXECUTION_LEASE_WRITE_MS - 1,
      ),
    ).toBe(false)
    expect(
      shouldWriteMissionExecutionLease(
        lastWrite,
        lastWrite + DEFAULT_MISSION_EXECUTION_LEASE_WRITE_MS,
      ),
    ).toBe(true)
  })
})
