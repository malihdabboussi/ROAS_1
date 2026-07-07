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

export interface TransferOptions {
  include_domains?: string[]
  include_email_domains?: string[]
  include_contacts?: boolean
  target_campaign_id?: string
  target_space_id?: string
  exclude_tables?: string[]
}

export const CHILD_TABLES_WITH_ORG_ID = [
  'offers',
  'avatars',
  'presentations',
  'funnels',
  'sequences',
  'conversations',
  'missions',
  'social_posts',
  'blog_posts',
  'ad_campaigns',
  'leads',
  'media_assets',
] as const

export const CHILD_TABLES_NO_ORG_ID = [
  'campaign_nodes',
  'campaign_edges',
  'campaign_node_sources',
  'campaign_workflows',
  'campaign_workflow_edges',
  'campaign_workflow_layouts',
  'campaign_tasks',
  'campaign_plans',
  'campaign_strategy_nodes',
  'campaign_integration_connections',
] as const

export const SPACE_CHILD_TABLES_WITH_ORG_ID = [
  'space_items',
  'space_item_activity',
  'space_item_shares',
  'space_shares',
] as const

export const MOVABLE_ARTIFACT_TABLES = [
  'offers',
  'funnels',
  'ads',
  'ad_campaigns',
  'sequences',
  'presentations',
  'avatars',
  'social_posts',
  'blog_posts',
  'media_assets',
] as const

export type MovableArtifactTable = (typeof MOVABLE_ARTIFACT_TABLES)[number]
