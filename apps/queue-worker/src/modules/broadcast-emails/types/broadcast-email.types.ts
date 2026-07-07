export interface BroadcastEmailJobData {
  broadcastScheduleId: string
}

export interface BroadcastEmailJobResult {
  broadcastScheduleId: string
  success: boolean
  sentCount: number
  failedCount: number
  skippedCount: number
  processedAt: string
  error?: string
}

export const BROADCAST_EMAILS_QUEUE = 'broadcast-emails'
