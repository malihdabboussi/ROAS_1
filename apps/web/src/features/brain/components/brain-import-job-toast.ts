import type { BrainImportNotificationJob } from '../services/user-brain-import.service'

export type BrainImportToastKind = 'success' | 'info' | 'error'

export type BrainImportToast = {
  kind: BrainImportToastKind
  message: string
}

export type PlannedBrainImportToasts = {
  acknowledgedIds: string[]
  successMessages: string[]
  infoMessages: string[]
  errorMessages: string[]
}

function isSlackImportJob(job: BrainImportNotificationJob): boolean {
  return job.job_type === 'slack_period_import' || job.job_type === 'campaign_slack_import'
}

function isSkippedResult(job: BrainImportNotificationJob): boolean {
  const result = (job.result ?? {}) as { status?: unknown; reason?: unknown }
  return result.status === 'skipped'
}

function isEmptySlackIngestFailure(job: BrainImportNotificationJob): boolean {
  if (!isSlackImportJob(job)) return false
  const err = typeof job.last_error === 'string' ? job.last_error.toLowerCase() : ''
  if (!err) return false
  return (
    err.includes('no content') ||
    err.includes('nothing to ingest') ||
    err.includes('could not ingest') ||
    err.includes('processable content') ||
    err.includes('no message content') ||
    err.includes('no significant knowledge')
  )
}

function isSilentEmptySlackImport(job: BrainImportNotificationJob): boolean {
  if (!isSlackImportJob(job)) return false
  return isSkippedResult(job) || isEmptySlackIngestFailure(job)
}

function skippedMessage(job: BrainImportNotificationJob): string {
  const result = (job.result ?? {}) as { reason?: unknown }
  return typeof result.reason === 'string' && result.reason.trim()
    ? result.reason.trim()
    : `Skipped: ${job.title}`
}

function successMessage(job: BrainImportNotificationJob): string {
  const result = (job.result ?? {}) as { memories_created?: number; snapshots_created?: number }
  const memories = typeof result.memories_created === 'number' ? result.memories_created : null
  const snapshots = typeof result.snapshots_created === 'number' ? result.snapshots_created : null
  if (memories != null || snapshots != null) {
    return `Import done: ${snapshots ?? 0} snapshot(s), ${memories ?? 0} memory(ies)`
  }
  return `Import done: ${job.title}`
}

function failureMessage(job: BrainImportNotificationJob): string {
  const err = typeof job.last_error === 'string' && job.last_error.trim() ? job.last_error : null
  return err ? `Import failed: ${err}` : `Import failed: ${job.title}`
}

export function resolveBrainImportToast(job: BrainImportNotificationJob): BrainImportToast | null {
  if (isSilentEmptySlackImport(job)) return null
  if (job.status === 'succeeded') {
    if (isSkippedResult(job)) {
      return { kind: 'info', message: skippedMessage(job) }
    }
    return { kind: 'success', message: successMessage(job) }
  }
  return { kind: 'error', message: failureMessage(job) }
}

function failureToastKey(job: BrainImportNotificationJob): string {
  const err = typeof job.last_error === 'string' ? job.last_error.trim() : ''
  return err || `title:${job.title}`
}

export function planBrainImportNotificationToasts(
  jobs: BrainImportNotificationJob[],
): PlannedBrainImportToasts {
  const acknowledgedIds: string[] = []
  const successMessages: string[] = []
  const infoMessages = new Set<string>()
  const failureGroups = new Map<string, string[]>()

  for (const job of jobs) {
    if (job.status !== 'succeeded' && job.status !== 'failed') continue
    const outcome = resolveBrainImportToast(job)
    if (!outcome) {
      acknowledgedIds.push(job.id)
      continue
    }
    if (outcome.kind === 'success') {
      successMessages.push(outcome.message)
      acknowledgedIds.push(job.id)
      continue
    }
    if (outcome.kind === 'info') {
      infoMessages.add(outcome.message)
      acknowledgedIds.push(job.id)
      continue
    }
    const group = failureGroups.get(failureToastKey(job)) ?? []
    group.push(outcome.message)
    failureGroups.set(failureToastKey(job), group)
    acknowledgedIds.push(job.id)
  }

  const errorMessages: string[] = []
  for (const group of failureGroups.values()) {
    const first = group[0]
    if (!first) continue
    errorMessages.push(
      group.length === 1
        ? first
        : `Import failed (${group.length}): ${first.replace(/^Import failed: /, '')}`,
    )
  }

  return {
    acknowledgedIds,
    successMessages,
    infoMessages: [...infoMessages],
    errorMessages,
  }
}
