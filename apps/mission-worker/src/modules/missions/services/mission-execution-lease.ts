export const DEFAULT_MISSION_EXECUTION_LEASE_TIMEOUT_MS = 90_000
export const DEFAULT_MISSION_EXECUTION_START_LEASE_TIMEOUT_MS = 360_000
export const DEFAULT_MISSION_EXECUTION_LEASE_WRITE_MS = 15_000
export const DEFAULT_MISSION_RECOVERY_POLL_MS = 30_000

function readPositiveMs(value: string | undefined, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export function getMissionExecutionLeaseTimeoutMs(): number {
  return readPositiveMs(
    process.env.MISSIONS_EXECUTION_LEASE_TIMEOUT_MS,
    DEFAULT_MISSION_EXECUTION_LEASE_TIMEOUT_MS,
  )
}

export function getMissionExecutionStartLeaseTimeoutMs(): number {
  return readPositiveMs(
    process.env.MISSIONS_EXECUTION_START_LEASE_TIMEOUT_MS,
    DEFAULT_MISSION_EXECUTION_START_LEASE_TIMEOUT_MS,
  )
}

export function getMissionExecutionLeaseWriteMs(): number {
  return readPositiveMs(
    process.env.MISSIONS_EXECUTION_LEASE_WRITE_MS,
    DEFAULT_MISSION_EXECUTION_LEASE_WRITE_MS,
  )
}

export function getMissionRecoveryPollMs(): number {
  return readPositiveMs(process.env.MISSIONS_RECOVERY_POLL_MS, DEFAULT_MISSION_RECOVERY_POLL_MS)
}

export function isPastMissionExecutionLease(
  updatedAt: string | null | undefined,
  nowMs = Date.now(),
  leaseTimeoutMs?: number,
  executionStatus?: string | null,
): boolean {
  if (!updatedAt) return false
  const updatedAtMs = new Date(updatedAt).getTime()
  if (!Number.isFinite(updatedAtMs)) return false
  const resolvedTimeoutMs =
    leaseTimeoutMs ??
    (executionStatus === 'starting'
      ? getMissionExecutionStartLeaseTimeoutMs()
      : getMissionExecutionLeaseTimeoutMs())
  return nowMs - updatedAtMs >= resolvedTimeoutMs
}

export function shouldWriteMissionExecutionLease(
  lastWriteMs: number,
  nowMs = Date.now(),
  writeIntervalMs = getMissionExecutionLeaseWriteMs(),
): boolean {
  return nowMs - lastWriteMs >= writeIntervalMs
}
