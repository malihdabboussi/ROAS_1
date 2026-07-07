import { backendPost } from '@/lib/api/backend-client'

export type TransferMode = 'move' | 'copy'
export type TransferEntityType = 'campaign' | 'artifact' | 'media' | 'project' | 'space' | 'view'

export interface TransferContext {
  org_id: string | null
}

export interface TransferPreviewResult {
  entity: { id: string; name: string; type: TransferEntityType }
  source_context: TransferContext
  target_context: TransferContext
  mode: TransferMode
  children: Record<string, number>
  warnings: string[]
  linked_resources: {
    domains: Array<{ id: string; domain: string }>
    email_domains: Array<{ id: string; domain: string }>
    contacts: number
  }
}

export interface TransferExecuteResult {
  success: boolean
  entity_id: string
  mode: TransferMode
  transferred: Record<string, number>
}

export interface TransferPreviewParams {
  entity_type: TransferEntityType
  entity_id: string
  artifact_table?: string
  target_context: TransferContext
  mode: TransferMode
}

export interface TransferExecuteParams {
  entity_type: TransferEntityType
  entity_ids: string[]
  artifact_table?: string
  target_context: TransferContext
  mode: TransferMode
  options?: {
    include_domains?: string[]
    include_email_domains?: string[]
    include_contacts?: boolean
    target_campaign_id?: string
    target_space_id?: string
    exclude_tables?: string[]
  }
}

export const transferService = {
  preview: (params: TransferPreviewParams) =>
    backendPost<{ success: boolean; preview: TransferPreviewResult }>(
      '/api/transfer/preview',
      params,
    ),

  execute: (params: TransferExecuteParams) =>
    backendPost<{ success: boolean; results: TransferExecuteResult[] }>(
      '/api/transfer/execute',
      params,
    ),
}
