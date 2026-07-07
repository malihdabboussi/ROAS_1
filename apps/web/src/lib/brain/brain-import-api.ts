import { backendDelete, backendGet, backendPost } from '@/lib/api/backend-client'
import type { AssetRef } from '@/lib/media/presigned-client-upload'

export interface BrainImportEnqueueResult {
  success: boolean
  jobId: string
  status: 'queued' | 'processing' | 'retry' | 'succeeded' | 'failed'
  deduped?: boolean
}

export interface BrainImportNotificationJob {
  id: string
  job_type: string
  title: string
  status: 'succeeded' | 'failed'
  result?: Record<string, unknown> | null
  last_error?: string | null
  completed_at?: string | null
}

export interface BrainQueueJob {
  id: string
  job_type: string
  queue_kind?: 'import' | 'brain_ops'
  title: string
  status: 'queued' | 'processing' | 'retry' | 'succeeded' | 'failed'
  brain_id?: string | null
  result?: Record<string, unknown> | null
  last_error?: string | null
  created_at: string
  updated_at?: string | null
  completed_at?: string | null
}

export interface FathomMeeting {
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

export interface FirefliesTranscript {
  id: string
  title: string
  date?: number
  duration?: number
  summary?: { short_summary?: string; overview?: string }
}

export async function getFathomStatus(): Promise<{ connected: boolean }> {
  const res = await backendGet<{ success: boolean; connected: boolean }>(
    '/api/integrations/fathom/status',
  )
  return { connected: res.connected ?? false }
}

export async function getFirefliesStatus(): Promise<{ connected: boolean }> {
  const res = await backendGet<{ success: boolean; connected: boolean }>(
    '/api/integrations/fireflies/status',
  )
  return { connected: res.connected ?? false }
}

export async function listFathomMeetings(cursor?: string): Promise<{
  items: FathomMeeting[]
  next_cursor?: string
}> {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''
  const response = await backendGet<{
    success: boolean
    items: FathomMeeting[]
    next_cursor?: string
  }>(`/api/integrations/fathom/meetings${query}`)
  return { items: response.items ?? [], next_cursor: response.next_cursor }
}

export async function importFathomMeeting(
  meeting: FathomMeeting,
  options?: { brainId?: string; targetBrain?: 'user' | 'agent' },
): Promise<{
  success: boolean
  jobId: string
  status: 'queued' | 'processing' | 'retry' | 'succeeded' | 'failed'
  deduped?: boolean
}> {
  return backendPost('/api/brain/import-jobs/fathom-meeting', {
    meeting,
    ...(options?.brainId ? { brainId: options.brainId } : {}),
    ...(options?.targetBrain ? { targetBrain: options.targetBrain } : {}),
  })
}

export async function listFirefliesTranscripts(limit = 20): Promise<FirefliesTranscript[]> {
  const response = await backendGet<{
    success: boolean
    transcripts: FirefliesTranscript[]
  }>(`/api/integrations/fireflies/transcripts?limit=${limit}`)
  return response.transcripts ?? []
}

export async function importFirefliesTranscript(
  id: string,
  options?: { brainId?: string; targetBrain?: 'user' | 'agent' },
): Promise<{
  success: boolean
  jobId: string
  status: 'queued' | 'processing' | 'retry' | 'succeeded' | 'failed'
  deduped?: boolean
}> {
  return backendPost('/api/brain/import-jobs/fireflies-transcript', {
    transcriptId: id,
    ...(options?.brainId ? { brainId: options.brainId } : {}),
    ...(options?.targetBrain ? { targetBrain: options.targetBrain } : {}),
  })
}

export async function rememberDocumentMemory(input: {
  content: string
  title?: string
  sourceType: 'document' | 'dropbox' | 'google_drive'
  sourceId?: string
  mediaType?: 'text' | 'image' | 'audio' | 'video' | 'pdf' | 'multimodal'
  mediaUrl?: string
  mediaMimeType?: string
  mediaBase64?: string
  mediaCaption?: string
  assetId?: string | null
  assetRef?: AssetRef | null
}): Promise<BrainImportEnqueueResult> {
  return backendPost('/api/brain/import-jobs/remember-document', {
    content: input.content,
    sourceType: input.sourceType,
    sourceId: input.sourceId ?? null,
    sourceTitle: input.title ?? null,
    mediaType: input.mediaType ?? 'text',
    mediaUrl: input.mediaUrl ?? null,
    mediaMimeType: input.mediaMimeType ?? null,
    mediaBase64: input.mediaBase64 ?? null,
    mediaCaption: input.mediaCaption ?? null,
    assetId: input.assetId ?? null,
    assetRef: input.assetRef ?? null,
  })
}

export async function enqueueDocumentMemoryImport(input: {
  content: string
  title?: string
  sourceType: 'document' | 'dropbox' | 'google_drive'
  sourceId?: string
  mediaType?: 'text' | 'image' | 'audio' | 'video' | 'pdf' | 'multimodal'
  mediaUrl?: string
  mediaMimeType?: string
  mediaBase64?: string
  mediaCaption?: string
  assetId?: string | null
  assetRef?: AssetRef | null
}): Promise<BrainImportEnqueueResult> {
  return backendPost('/api/brain/import-jobs/remember-document', {
    content: input.content,
    sourceType: input.sourceType,
    sourceId: input.sourceId ?? null,
    sourceTitle: input.title ?? null,
    mediaType: input.mediaType ?? 'text',
    mediaUrl: input.mediaUrl ?? null,
    mediaMimeType: input.mediaMimeType ?? null,
    mediaBase64: input.mediaBase64 ?? null,
    mediaCaption: input.mediaCaption ?? null,
    assetId: input.assetId ?? null,
    assetRef: input.assetRef ?? null,
  })
}

export async function rememberLinkMemory(input: {
  url: string
  title?: string
}): Promise<BrainImportEnqueueResult> {
  return backendPost('/api/brain/import-jobs/remember-link', input)
}

export async function listPendingImportNotifications(): Promise<BrainImportNotificationJob[]> {
  const response = await backendGet<{ success: boolean; jobs: BrainImportNotificationJob[] }>(
    '/api/brain/import-jobs/notifications/pending',
  )
  return response.jobs ?? []
}

export async function acknowledgeImportNotifications(jobIds: string[]): Promise<void> {
  if (!jobIds.length) return
  await backendPost('/api/brain/import-jobs/notifications/ack', { jobIds })
}

export async function listActiveImportJobs(scope?: {
  brainId?: string | null
  campaignId?: string | null
  targetBrain?: 'user' | 'all' | null
  limit?: number
}): Promise<BrainQueueJob[]> {
  const params = new URLSearchParams()
  if (scope?.brainId) params.set('brainId', scope.brainId)
  if (scope?.campaignId) params.set('campaignId', scope.campaignId)
  if (scope?.targetBrain) params.set('targetBrain', scope.targetBrain)
  if (scope?.limit) params.set('limit', String(scope.limit))
  const qs = params.toString()
  const response = await backendGet<{ success: boolean; jobs: BrainQueueJob[] }>(
    `/api/brain/import-jobs/active${qs ? `?${qs}` : ''}`,
  )
  return response.jobs ?? []
}

export async function enqueueSkIngest(input: {
  brainId: string
  text: string
  sourceType: string
  title: string
  domain?: 'strategy' | 'marketing' | 'finance' | 'operations' | 'creative' | 'general'
  mediaType?: 'text' | 'image' | 'audio' | 'video' | 'pdf' | 'multimodal'
  mediaUrl?: string | null
  mediaMimeType?: string | null
  mediaCaption?: string | null
  assetId?: string | null
  assetRef?: AssetRef | null
}): Promise<BrainImportEnqueueResult> {
  return backendPost('/api/brain/import-jobs/sk-ingest', {
    brainId: input.brainId,
    text: input.text,
    sourceType: input.sourceType,
    title: input.title,
    domain: input.domain,
    mediaType: input.mediaType ?? 'text',
    mediaUrl: input.mediaUrl ?? null,
    mediaMimeType: input.mediaMimeType ?? null,
    mediaCaption: input.mediaCaption ?? null,
    assetId: input.assetId ?? null,
    assetRef: input.assetRef ?? null,
  })
}

export async function enqueueSkLinkIngest(input: {
  brainId: string
  url: string
  sourceType?: string
  title?: string
  domain?: 'strategy' | 'marketing' | 'finance' | 'operations' | 'creative' | 'general'
}): Promise<BrainImportEnqueueResult> {
  return backendPost('/api/brain/import-jobs/sk-ingest-link', {
    brainId: input.brainId,
    url: input.url,
    sourceType: input.sourceType,
    title: input.title,
    domain: input.domain,
  })
}

export async function cancelImportJob(jobId: string): Promise<void> {
  await backendDelete(`/api/brain/import-jobs/${jobId}`)
}

export async function retryImportJob(jobId: string): Promise<void> {
  await backendPost(`/api/brain/import-jobs/${jobId}/retry`, {})
}

export async function dismissImportJob(jobId: string): Promise<void> {
  await backendDelete(`/api/brain/import-jobs/${jobId}/dismiss`)
}
