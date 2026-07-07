export const DRIVE_SYNC_QUEUE = 'drive-sync'

export type DriveSyncReason = 'manual' | 'cron' | 'initial' | 'push'

export type DriveSyncJobData = {
  mappingId: string
  userId: string
  reason: DriveSyncReason
}

export type DriveSyncJobResult = {
  success: boolean
  mappingId: string
  skipped?: boolean
  reason?: string
  inserted?: number
  updated?: number
  deleted?: number
  total?: number
}
