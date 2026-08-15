import { BRAIN_TOAST_ERRORS } from '../config/brain-toast-errors.config'
import type { BrainImportNotificationJob } from '../services/user-brain-import.service'

export type BrainImportToastKind = 'success' | 'info' | 'error'

export type BrainImportToast = {
  kind: BrainImportToastKind
  message: string
}

function isSkippedResult(job: BrainImportNotificationJob): boolean {
  const result = (job.result ?? {}) as { status?: unknown; reason?: unknown }
  return result.status === 'skipped'
}

function isEmptySlackIngestFailure(job: BrainImportNotificationJob): boolean {
  if (job.job_type !== 'slack_period_import' && job.job_type !== 'campaign_slack_import') {
    return false
  }
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

function skippedMessage(job: BrainImportNotificationJob): string {
  const result = (job.result ?? {}) as { reason?: unknown }
  return typeof result.reason === 'string' && result.reason.trim()
    ? result.reason.trim()
    : BRAIN_TOAST_ERRORS.SLACK_PERIOD_EMPTY.userMessage
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

export function resolveBrainImportToast(job: BrainImportNotificationJob): BrainImportToast {
  if (job.status === 'succeeded') {
    if (isSkippedResult(job)) {
      return { kind: 'info', message: skippedMessage(job) }
    }
    return { kind: 'success', message: successMessage(job) }
  }
  if (isEmptySlackIngestFailure(job)) {
    return { kind: 'info', message: BRAIN_TOAST_ERRORS.SLACK_PERIOD_EMPTY.userMessage }
  }
  return { kind: 'error', message: failureMessage(job) }
}

export function failureToastKey(job: BrainImportNotificationJob): string {
  const err = typeof job.last_error === 'string' ? job.last_error.trim() : ''
  return err || `title:${job.title}`
}
