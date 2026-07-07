import { describe, expect, it } from 'vitest'
import {
  notificationDotClass,
  notificationMarkdownSource,
  notificationRetryJobId,
  notificationTypeLabel,
} from './notification-meta'

describe('notification-meta', () => {
  it('maps known and unknown notification types to display labels', () => {
    expect(notificationTypeLabel('mission_completed')).toBe('Completed')
    expect(notificationTypeLabel('space_task_status_changed')).toBe('Task Status')
    expect(notificationTypeLabel('custom_future_type')).toBe('Custom Future Type')
  })

  it('maps known and unknown notification types to dot classes', () => {
    expect(notificationDotClass('brain_import_failed')).toBe('indicator-dot-glass-red')
    expect(notificationDotClass('custom_future_type')).toBe('indicator-dot-glass-muted')
  })

  it('preserves hard line breaks for markdown rendering', () => {
    expect(notificationMarkdownSource('Line one\\nLine two\n\nNext')).toBe(
      'Line one  \nLine two\n\nNext',
    )
  })

  it('extracts retry job ids only for retryable brain import notifications', () => {
    expect(
      notificationRetryJobId({
        metadata: {
          retry_action: 'brain_import_job_retry',
          brain_import_job_id: 'job-1',
        },
      }),
    ).toBe('job-1')

    expect(
      notificationRetryJobId({
        metadata: {
          retry_action: 'other',
          brain_import_job_id: 'job-1',
        },
      }),
    ).toBeNull()
  })
})
