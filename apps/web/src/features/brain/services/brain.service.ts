'use client'

import { backendDelete, backendGet, backendPatch, backendPost } from '@/lib/api/backend-client'
import { cachedFetch } from '@/lib/cache/keyed-fetch-cache'
import type {
  BeliefPattern,
  BrainGraphData,
  BrainHealthData,
  BrainTimeline,
  BrainTimelineItem,
  BrainMemory,
  CustomerBrainView,
  CompanyCortexObject,
  CompanyCortexSignal,
  CustomerAvatar,
  EmotionalProfile,
  NarrativePage,
  PendingCapture,
  Perspective,
} from '../types'

// ============================================================================
// Brain API Service
// ============================================================================

export async function fetchBrainGraph(
  agentId?: string,
  brainId?: string,
  limit?: number,
): Promise<BrainGraphData> {
  const params = new URLSearchParams()
  if (brainId?.trim()) params.set('brain_id', brainId.trim())
  else if (agentId?.trim()) params.set('agent_id', agentId.trim())
  if (limit) params.set('limit', String(limit))
  const query = params.toString() ? `?${params.toString()}` : ''
  return backendGet<BrainGraphData>(`/api/brain/graph${query}`)
}

export async function fetchBrainHealth(
  agentId?: string,
  brainId?: string,
): Promise<BrainHealthData> {
  const params = new URLSearchParams()
  if (brainId?.trim()) params.set('brain_id', brainId.trim())
  else if (agentId?.trim()) params.set('agent_id', agentId.trim())
  const query = params.toString() ? `?${params.toString()}` : ''
  return backendGet<BrainHealthData>(`/api/brain/health${query}`)
}

export async function fetchBrainHealthBatch(
  brainIds: string[],
): Promise<Map<string, BrainHealthData>> {
  const ids = [...new Set(brainIds.map((id) => id.trim()).filter(Boolean))].sort()
  if (ids.length === 0) return new Map()

  // Signature-keyed TTL cache: BrainHome's batch effect re-runs when the
  // scope-nav resource notifies with an identity-changed (but identical)
  // scopeOptions array — same sorted ids hit this cache instead of refiring
  // the heaviest endpoint of the page.
  return cachedFetch(
    `brain-health-batch:${ids.join(',')}`,
    async () => {
      const params = new URLSearchParams()
      params.set('brain_ids', ids.join(','))
      const res = await backendGet<{ brains: Array<BrainHealthData & { brain_id: string }> }>(
        `/api/brain/health/batch?${params.toString()}`,
      )
      return new Map((res.brains ?? []).map((brain) => [brain.brain_id, brain]))
    },
    { ttlMs: 30_000 },
  )
}

export async function fetchBrainSearch(
  query: string,
  limit = 10,
  brainId?: string,
  agentId?: string,
): Promise<BrainMemory[]> {
  const params = new URLSearchParams()
  params.set('q', query)
  params.set('limit', String(limit))
  if (brainId?.trim()) params.set('brainId', brainId.trim())
  else if (agentId?.trim()) params.set('agentId', agentId.trim())
  const res = await backendGet<{ results: BrainMemory[] }>(`/api/brain/search?${params.toString()}`)
  return res.results ?? []
}

export async function fetchBrainImageSearch(input: {
  base64: string
  mimeType: string
  caption?: string
  limit?: number
  brainId?: string
  agentId?: string
}): Promise<BrainMemory[]> {
  const res = await backendPost<{ results: BrainMemory[] }>('/api/brain/search/image', input)
  return res.results ?? []
}

export async function fetchBrainMemory(id: string): Promise<BrainMemory> {
  return backendGet<BrainMemory>(`/api/brain/memories/${id}`)
}

export async function fetchBrainStats(): Promise<BrainGraphData['stats']> {
  return backendGet<BrainGraphData['stats']>('/api/brain/stats')
}

export async function fetchSnapshotStats(): Promise<Record<string, number>> {
  return backendGet<Record<string, number>>('/api/brain/snapshots/stats')
}

export async function fetchPendingCaptures(): Promise<PendingCapture[]> {
  return backendPost<PendingCapture[]>('/api/brain/pending', {})
}

export async function acceptPendingCapture(id: string): Promise<{ accepted: boolean }> {
  return backendPost<{ accepted: boolean }>(`/api/brain/pending/${id}/accept`, {})
}

export async function rejectPendingCapture(id: string): Promise<{ rejected: boolean }> {
  return backendPost<{ rejected: boolean }>(`/api/brain/pending/${id}/reject`, {})
}

export async function submitSearchFeedback(input: {
  snapshotId: string
  query: string
  rating: 1 | -1
  searchMode?: string
  position?: number
  comment?: string
}): Promise<{ id: string }> {
  return backendPost<{ id: string }>('/api/brain/search/feedback', input)
}

// ============================================================================
// Emotional Intelligence API (Dispenza Layers 3-5)
// ============================================================================

export async function fetchEmotionalProfile(): Promise<EmotionalProfile> {
  return backendGet<EmotionalProfile>('/api/brain/emotional-profile')
}

export async function fetchBeliefPatterns(brainId?: string | null): Promise<BeliefPattern[]> {
  const qs = brainId ? `?brainId=${encodeURIComponent(brainId)}` : ''
  return backendGet<BeliefPattern[]>(`/api/brain/patterns${qs}`)
}

export async function fetchPerspectives(brainId?: string | null): Promise<Perspective[]> {
  const qs = brainId ? `?brainId=${encodeURIComponent(brainId)}` : ''
  return backendGet<Perspective[]>(`/api/brain/perspectives${qs}`)
}

export async function fetchCustomerAvatars(brainId: string): Promise<CustomerAvatar[]> {
  if (!brainId) return []
  return backendGet<CustomerAvatar[]>(`/api/brain/avatars?brainId=${encodeURIComponent(brainId)}`)
}

export async function fetchCustomerBrainView(brainId: string): Promise<CustomerBrainView> {
  return backendGet<CustomerBrainView>(
    `/api/brain/customer/view?brainId=${encodeURIComponent(brainId)}`,
  )
}

// ── Customer brain — direct manual entry (Add Information panel) ────────────

export async function addCustomerBrainText(input: {
  brainId?: string | null
  title?: string | null
  content: string
  contactId?: string | null
}): Promise<{ success: boolean; memory_id: string; brain_id: string; contact_id: string | null }> {
  return backendPost('/api/brain/customer/memories/text', {
    brainId: input.brainId ?? undefined,
    title: input.title ?? null,
    content: input.content,
    contactId: input.contactId ?? null,
  })
}

export async function addCustomerBrainLink(input: {
  brainId?: string | null
  url: string
  title?: string | null
  contactId?: string | null
}): Promise<{ success: boolean; memory_id: string; brain_id: string; contact_id: string | null }> {
  return backendPost('/api/brain/customer/memories/link', {
    brainId: input.brainId ?? undefined,
    url: input.url,
    title: input.title ?? null,
    contactId: input.contactId ?? null,
  })
}

export async function detectPatterns(
  days = 7,
): Promise<{ status: string; patterns_processed?: number }> {
  return backendPost<{ status: string; patterns_processed?: number }>(
    '/api/brain/patterns/detect',
    { days },
  )
}

export async function deleteBrainMemory(id: string): Promise<{ success: boolean }> {
  return backendDelete<{ success: boolean }>(`/api/brain/memories/${encodeURIComponent(id)}`)
}

export async function deleteBrainSnapshot(id: string): Promise<{ success: boolean }> {
  return backendDelete<{ success: boolean }>(`/api/brain/snapshots/${encodeURIComponent(id)}`)
}

export type BrainScopePayload = {
  type: 'user' | 'agent' | 'campaign'
  agent_id?: string
  campaign_id?: string
}

export async function transferBrainNode(input: {
  operation: 'copy' | 'move'
  node_type: 'memory' | 'snapshot' | 'sk_entry' | 'sk_source' | 'experience'
  node_id: string
  source_scope: BrainScopePayload
  target_scope: BrainScopePayload
  connected_node_ids?: string[]
  source_type?: string
  source_id?: string | null
  source_title?: string | null
}): Promise<{ success: boolean; copied: number; moved: number }> {
  return backendPost<{ success: boolean; copied: number; moved: number }>(
    '/api/brain/nodes/transfer',
    input,
  )
}

// ============================================================================
// Cortex Max API
// ============================================================================

export type CortexMaxToggleResponse =
  | { success: true; cortex_max: boolean; initial_sync_triggered: boolean }
  | { success: false; error?: string }

export type CortexMaxPagesResponse =
  | { success: true; cortex_max: boolean; pages: NarrativePage[] }
  | { success: false; error?: string }

export type CortexMaxTimelinesResponse =
  | { success: true; cortex_max: boolean; timelines: BrainTimeline[] }
  | { success: false; error?: string }

export type CortexMaxTimelineItemsResponse =
  | { success: true; cortex_max: boolean; items: BrainTimelineItem[] }
  | { success: false; error?: string }

export async function toggleCortexMax(
  brainId: string,
  enabled: boolean,
): Promise<CortexMaxToggleResponse> {
  return backendPatch<CortexMaxToggleResponse>(
    `/api/brain/${encodeURIComponent(brainId)}/cortex-max`,
    { enabled },
  )
}

export async function crystallizeCortexMax(brainId: string): Promise<{
  success: boolean
  library_sync_enqueued: boolean
  pattern_analysis_enqueued: boolean
  timeline_synthesis_enqueued?: boolean
}> {
  return backendPost<{
    success: boolean
    library_sync_enqueued: boolean
    pattern_analysis_enqueued: boolean
    timeline_synthesis_enqueued?: boolean
  }>(`/api/brain/${brainId}/cortex-max/crystallize`, {})
}

export async function setBrainImage(
  brainId: string,
  imageUrl: string | null,
): Promise<{ success: boolean; brain_id: string; image_url: string | null }> {
  return backendPatch<{ success: boolean; brain_id: string; image_url: string | null }>(
    `/api/brain/${encodeURIComponent(brainId)}/image`,
    { image_url: imageUrl },
  )
}

export async function fetchCustomerBrainStatus(): Promise<{
  success: boolean
  brain_id: string
  enabled: boolean
}> {
  return backendGet<{ success: boolean; brain_id: string; enabled: boolean }>(
    '/api/brain/customer/status',
  )
}

export async function setCustomerBrainEnabled(enabled: boolean): Promise<{
  success: boolean
  brain_id: string | null
  enabled: boolean
}> {
  return backendPatch<{ success: boolean; brain_id: string | null; enabled: boolean }>(
    '/api/brain/customer/enabled',
    { enabled },
  )
}

export type CompanyCortexSchedule = 'daily' | 'weekdays' | 'manual_only'

export type CompanyCortexSettings = {
  org_id: string
  brain_id: string
  enabled: boolean
  schedule: CompanyCortexSchedule
  local_time: string
  timezone: string
  lookback_hours: number
  include_sources: string[]
  min_activity_threshold: number
  last_successful_dream_at: string | null
}

export async function fetchCompanyCortexStatus(): Promise<{
  success: boolean
  brain_id: string
  enabled: boolean
  settings: CompanyCortexSettings
}> {
  return backendGet<{
    success: boolean
    brain_id: string
    enabled: boolean
    settings: CompanyCortexSettings
  }>('/api/brain/company/status')
}

export async function updateCompanyCortexSettings(input: {
  enabled?: boolean
  schedule?: CompanyCortexSchedule
  localTime?: string
  timezone?: string
  lookbackHours?: number
  minActivityThreshold?: number
}): Promise<{
  success: boolean
  brain_id: string
  enabled: boolean
  settings: CompanyCortexSettings
}> {
  return backendPatch<{
    success: boolean
    brain_id: string
    enabled: boolean
    settings: CompanyCortexSettings
  }>('/api/brain/company/settings', input)
}

export async function fetchCompanyCortexObjects(): Promise<CompanyCortexObject[]> {
  const res = await backendGet<{ success: boolean; objects: CompanyCortexObject[] }>(
    '/api/brain/company/objects',
  )
  return res.objects ?? []
}

export async function fetchCompanyCortexSignals(): Promise<CompanyCortexSignal[]> {
  const res = await backendGet<{ success: boolean; signals: CompanyCortexSignal[] }>(
    '/api/brain/company/signals',
  )
  return res.signals ?? []
}

export async function reviewCompanyCortexSignal(
  signalId: string,
  decision: 'approve' | 'reject',
  note?: string,
): Promise<{ success: boolean; signal: { id: string; status: string } }> {
  return backendPatch<{ success: boolean; signal: { id: string; status: string } }>(
    `/api/brain/company/signals/${encodeURIComponent(signalId)}`,
    { decision, note },
  )
}

export async function updateCompanyCortexSignalStatus(
  signalId: string,
  status: 'active' | 'rejected',
): Promise<{ success: boolean; signal: { id: string; status: string } }> {
  return reviewCompanyCortexSignal(signalId, status === 'active' ? 'approve' : 'reject')
}

export async function fetchNarrativePages(brainId: string): Promise<CortexMaxPagesResponse> {
  return backendGet<CortexMaxPagesResponse>(
    `/api/brain/${encodeURIComponent(brainId)}/narrative-pages`,
  )
}

export async function fetchBrainTimelines(brainId: string): Promise<CortexMaxTimelinesResponse> {
  return backendGet<CortexMaxTimelinesResponse>(
    `/api/brain/${encodeURIComponent(brainId)}/timelines`,
  )
}

export async function fetchBrainTimelineItems(
  brainId: string,
  timelineId: string,
): Promise<CortexMaxTimelineItemsResponse> {
  return backendGet<CortexMaxTimelineItemsResponse>(
    `/api/brain/${encodeURIComponent(brainId)}/timelines/${encodeURIComponent(timelineId)}/items`,
  )
}
