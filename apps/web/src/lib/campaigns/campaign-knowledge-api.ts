import { backendDelete, backendGet, backendPost } from '@/lib/api/backend-client'
import type { AssetRef } from '@/lib/media/presigned-client-upload'

export type KnowledgeDomain =
  | 'strategy'
  | 'marketing'
  | 'finance'
  | 'operations'
  | 'creative'
  | 'general'
export type KnowledgeSourceType = 'mission' | 'upload' | 'drive' | 'dropbox' | 'url' | 'auto_sync'

export const KNOWLEDGE_DOMAINS: { value: KnowledgeDomain; label: string }[] = [
  { value: 'general', label: 'General' },
  { value: 'strategy', label: 'Strategy' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'finance', label: 'Finance' },
  { value: 'operations', label: 'Operations' },
  { value: 'creative', label: 'Creative' },
]

const FULL_DOMAINS: KnowledgeDomain[] = [
  'strategy',
  'marketing',
  'finance',
  'operations',
  'creative',
  'general',
]

export const DEFAULT_AGENT_DOMAINS: Record<string, KnowledgeDomain[]> = {
  ceo: FULL_DOMAINS,
  cfo: ['finance', 'operations', 'strategy', 'general'],
  copywriter: ['marketing', 'creative', 'general'],
  designer: ['creative', 'general'],
  analyst: ['marketing', 'finance', 'general'],
  developer: ['creative', 'general'],
  pm_marketing: ['strategy', 'marketing', 'creative', 'general'],
  pm_product: ['strategy', 'operations', 'creative', 'general'],
  pm_operations: ['strategy', 'operations', 'finance', 'general'],
  product_manager: ['strategy', 'operations', 'creative', 'general'],
  automation_integrations_engineer: ['operations', 'creative', 'general'],
  qa_engineer: ['operations', 'creative', 'general'],
  media_producer: ['marketing', 'creative', 'general'],
  brand_manager: ['marketing', 'creative', 'general'],
  coach: ['strategy', 'operations', 'general'],
  widget_builder: ['creative', 'general'],
  customer_support: ['operations', 'general'],
  customer_success: ['strategy', 'operations', 'general'],
  customer_coach: ['strategy', 'operations', 'general'],
  brain_scholar: FULL_DOMAINS,
  ads_manager: ['marketing', 'finance', 'creative', 'general'],
}

export interface CampaignKnowledgeNode {
  id: string
  campaign_id: string
  user_id: string
  node_type: string
  title: string
  content: string
  source_type: KnowledgeSourceType
  source_id: string | null
  metadata: Record<string, unknown>
  domain: KnowledgeDomain
  media_type?: 'text' | 'image' | 'audio' | 'video' | 'pdf' | 'multimodal'
  media_url?: string | null
  media_mime_type?: string | null
  created_at: string
  updated_at: string
}

export interface CampaignKnowledgeEdge {
  id: string
  campaign_id: string
  user_id: string
  from_node_id: string
  to_node_id: string
  edge_type: string
  strength: number
  auto_generated: boolean
  metadata: Record<string, unknown>
  created_at: string
}

export interface CampaignFathomMeeting {
  id?: string
  recording_id?: string
  call_id?: string
  title: string
  meeting_title?: string
  url?: string
  created_at?: string
  transcript?: Array<{
    speaker?: { display_name?: string; name?: string }
    text?: string
    timestamp?: string
  }>
  default_summary?: { markdown_formatted?: string }
  action_items?: Array<{ description?: string }>
}

export interface CampaignFirefliesTranscript {
  id: string
  title: string
  date?: number
}

export interface CampaignImportEnqueueResult {
  success: boolean
  jobId: string
  status: 'queued' | 'processing' | 'retry' | 'succeeded' | 'failed'
  deduped?: boolean
}

export async function fetchCampaignKnowledgeNodes(
  campaignId: string,
  opts?: {
    nodeType?: string
    query?: string
    limit?: number
    domain?: string
    sourceType?: KnowledgeSourceType
  },
): Promise<CampaignKnowledgeNode[]> {
  const params = new URLSearchParams()
  if (opts?.nodeType) params.set('node_type', opts.nodeType)
  if (opts?.query) params.set('query', opts.query)
  if (opts?.limit) params.set('limit', String(opts.limit))
  if (opts?.domain) params.set('domain', opts.domain)
  if (opts?.sourceType) params.set('source_type', opts.sourceType)
  const qs = params.toString()
  return backendGet<CampaignKnowledgeNode[]>(
    `/api/campaigns/${campaignId}/knowledge/nodes${qs ? `?${qs}` : ''}`,
  )
}

export async function importCampaignKnowledgeUrl(
  campaignId: string,
  url: string,
  domain?: KnowledgeDomain,
): Promise<{ success: boolean; jobId: string; status: string; deduped: boolean }> {
  return backendPost(`/api/brain/import-jobs/campaign-url`, {
    campaignId,
    url,
    domain,
  })
}

export async function addCampaignKnowledgeFromDeliverable(
  campaignId: string,
  deliverableId: string,
): Promise<CampaignKnowledgeNode> {
  return backendPost<CampaignKnowledgeNode>(
    `/api/campaigns/${campaignId}/knowledge/from-deliverable`,
    { deliverable_id: deliverableId },
  )
}

export async function deleteCampaignKnowledgeNode(
  campaignId: string,
  nodeId: string,
): Promise<void> {
  return backendDelete(`/api/campaigns/${campaignId}/knowledge/nodes/${nodeId}`)
}

export async function searchCampaignKnowledge(
  campaignId: string,
  query: string,
  opts?: { domain?: KnowledgeDomain; domains?: KnowledgeDomain[] },
): Promise<{
  seeds: Array<Record<string, unknown>>
  traversed: Array<Record<string, unknown>>
  nodes: CampaignKnowledgeNode[]
}> {
  const params = new URLSearchParams()
  params.set('query', query)
  if (opts?.domain) params.set('domain', opts.domain)
  if (opts?.domains?.length) params.set('domains', opts.domains.join(','))
  return backendGet(`/api/campaigns/${campaignId}/knowledge/search?${params.toString()}`)
}

export async function fetchCampaignKnowledgeGraph(
  campaignId: string,
): Promise<{ nodes: CampaignKnowledgeNode[]; edges: CampaignKnowledgeEdge[] }> {
  return backendGet(`/api/campaigns/${campaignId}/knowledge/graph`)
}

export async function syncCampaignKnowledgeAssets(
  campaignId: string,
): Promise<{ created: Record<string, number> }> {
  return backendPost(`/api/campaigns/${campaignId}/knowledge/sync-assets`, {})
}

export async function organizeCampaignKnowledgeGraph(
  campaignId: string,
): Promise<{ created_edges: number }> {
  return backendPost(`/api/campaigns/${campaignId}/knowledge/organize`, {})
}

export async function importCampaignKnowledgeFromFathomMeeting(
  campaignId: string,
  meeting: CampaignFathomMeeting,
  domain?: KnowledgeDomain,
): Promise<CampaignImportEnqueueResult> {
  return backendPost('/api/brain/import-jobs/campaign-fathom', {
    campaignId,
    meeting,
    domain,
  })
}

export async function importCampaignKnowledgeFromFirefliesTranscript(
  campaignId: string,
  transcriptId: string,
  domain?: KnowledgeDomain,
): Promise<CampaignImportEnqueueResult> {
  return backendPost('/api/brain/import-jobs/campaign-fireflies', {
    campaignId,
    transcriptId,
    domain,
  })
}

export async function enqueueCampaignKnowledgeFileImport(input: {
  campaignId: string
  title: string
  content: string
  sourceType: 'upload' | 'drive' | 'dropbox'
  domain?: KnowledgeDomain
  mediaType?: 'text' | 'image' | 'audio' | 'video' | 'pdf' | 'multimodal'
  mediaUrl?: string
  mediaMimeType?: string
  mediaBase64?: string
  mediaCaption?: string
  assetId?: string | null
  assetRef?: AssetRef | null
}): Promise<CampaignImportEnqueueResult> {
  return backendPost('/api/brain/import-jobs/campaign-file', {
    ...input,
    assetId: input.assetId ?? null,
    assetRef: input.assetRef ?? null,
  })
}
