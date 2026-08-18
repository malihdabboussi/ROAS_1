import { readSlackThreadProvenance } from './work-request-conversation-stamp'

export const WORK_REQUEST_REMINDER_3H_MS = 3 * 60 * 60 * 1000
export const WORK_REQUEST_EXPIRY_WARNING_MS = 2 * 60 * 60 * 1000

export type WorkRequestReminderColumn = 'reminder_3h_sent_at' | 'reminder_1h_sent_at'

export function workRequestReminderText(column: WorkRequestReminderColumn, title: string): string {
  if (column === 'reminder_3h_sent_at') {
    return `It's been 3 hours. Your Service Request draft "${title}" is still waiting for review. Use the secure link from this conversation when you're ready.`
  }
  return `Hey — your Service Request review for "${title}" expires in 2 hours. Use the secure link from this conversation to complete it.`
}

export function slackReminderSendParams(provenance: unknown): {
  channel_id: string
  thread_ts?: string
  reply_broadcast?: boolean
} | null {
  const { channelId, threadTs } = readSlackThreadProvenance(provenance)
  if (!channelId) return null
  if (!threadTs) return { channel_id: channelId }
  return {
    channel_id: channelId,
    thread_ts: threadTs,
    reply_broadcast: true,
  }
}
