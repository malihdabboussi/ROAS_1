export interface SingleEmailJobData {
  scheduleId: string
}

export interface SingleEmailJobResult {
  scheduleId: string
  success: boolean
  messageId?: string
  processedAt: string
  error?: string
}

export const SINGLE_EMAILS_QUEUE = 'single-emails'
