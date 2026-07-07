export const CRM_SYNC_QUEUE = 'crm-sync'

export interface CrmSyncJobData {
  crmSyncJobId: string
}

export interface CrmSyncJobResult {
  crmSyncJobId: string
  success: boolean
  imported: number
  skipped: number
  fetched: number
  error?: string
}
