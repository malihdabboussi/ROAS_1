import { getApiOrigin } from '../shared/config'
import type {
  BrainScopeOption,
  CampaignRow,
  LlmModelOption,
  NsBrainRow,
  OrgMembership,
  PageCapture,
} from '../shared/types'
import { getActiveOrgId, getCachedOrRefreshSession } from './auth'

export interface BrowserSessionCookie {
  name: string
  value: string
  domain?: string
  path?: string
  expires?: number
  httpOnly?: boolean
  secure?: boolean
  sameSite?: 'Lax' | 'None' | 'Strict'
}

async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const base = getApiOrigin()
  const session = await getCachedOrRefreshSession()
  if (!session) {
    throw new Error('Not signed in — open the Vibey app and log in, then try again.')
  }
  const orgId = await getActiveOrgId()
  const url = `${base.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`
  return fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.accessToken}`,
      ...(orgId ? { 'x-org-id': orgId } : {}),
      ...init.headers,
    },
  })
}

export async function fetchScopes(): Promise<{
  brains: NsBrainRow[]
  campaigns: CampaignRow[]
}> {
  const res = await apiFetch('/api/brain/brains')
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `HTTP ${res.status}`)
  }
  const json = (await res.json()) as {
    success: boolean
    brains: NsBrainRow[]
    campaigns: CampaignRow[]
  }
  return { brains: json.brains ?? [], campaigns: json.campaigns ?? [] }
}

function buildTitle(capture: PageCapture): string {
  return (capture.articleTitle || capture.title || capture.url || 'Clip').slice(0, 500)
}

function bodyText(capture: PageCapture, mode: 'url' | 'selection' | 'article'): string {
  if (mode === 'selection' && capture.selectionText.trim()) return capture.selectionText.trim()
  if (mode === 'article' && capture.articleText?.trim()) return capture.articleText.trim()
  if (capture.selectionText.trim()) return capture.selectionText.trim()
  if (capture.articleText?.trim()) return capture.articleText.trim()
  return ''
}

function effectiveMode(
  capture: PageCapture,
  mode: 'url' | 'selection' | 'article',
): 'url' | 'selection' | 'article' {
  if (mode === 'selection' && !capture.selectionText?.trim()) {
    if (capture.articleText?.trim()) return 'article'
    return 'url'
  }
  if (mode === 'article' && !capture.articleText?.trim()) {
    if (capture.selectionText?.trim()) return 'selection'
    return 'url'
  }
  return mode
}

export async function sendCapture(
  scope: BrainScopeOption,
  capture: PageCapture,
  mode: 'url' | 'selection' | 'article',
): Promise<{ jobId?: string }> {
  const useMode = effectiveMode(capture, mode)
  const title = buildTitle(capture)
  const text = bodyText(capture, useMode)
  const url = capture.url

  if (scope.scopeType === 'user') {
    if (useMode === 'url' || !text) {
      const res = await apiFetch('/api/brain/import-jobs/remember-link', {
        method: 'POST',
        body: JSON.stringify({ url, title: capture.title || undefined }),
      })
      if (!res.ok) throw new Error(await res.text())
      const json = (await res.json()) as { jobId?: string; id?: string }
      return { jobId: json.jobId ?? json.id }
    }
    const content = text || `${url}\n\n${capture.title}`
    const res = await apiFetch('/api/brain/import-jobs/remember-document', {
      method: 'POST',
      body: JSON.stringify({
        content,
        sourceType: 'document',
        sourceTitle: title,
        mediaType: 'text',
      }),
    })
    if (!res.ok) throw new Error(await res.text())
    const json = (await res.json()) as { jobId?: string; id?: string }
    return { jobId: json.jobId ?? json.id }
  }

  if (scope.scopeType === 'agent') {
    if (!scope.brainId) throw new Error('Agent brain not available')
    if (useMode === 'url' || !text) {
      const res = await apiFetch('/api/brain/import-jobs/sk-ingest-link', {
        method: 'POST',
        body: JSON.stringify({
          brainId: scope.brainId,
          url,
          sourceType: 'url',
          title,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      const json = (await res.json()) as { jobId?: string; id?: string }
      return { jobId: json.jobId ?? json.id }
    }
    const res = await apiFetch('/api/brain/import-jobs/sk-ingest', {
      method: 'POST',
      body: JSON.stringify({
        brainId: scope.brainId,
        text: text || `${capture.title}\n${url}`.trim(),
        sourceType: 'document',
        title,
        mediaType: 'text',
      }),
    })
    if (!res.ok) throw new Error(await res.text())
    const json = (await res.json()) as { jobId?: string; id?: string }
    return { jobId: json.jobId ?? json.id }
  }

  if (scope.scopeType === 'campaign') {
    if (!scope.campaignId) throw new Error('Campaign not set')
    if (useMode === 'url' || !text) {
      const res = await apiFetch('/api/brain/import-jobs/campaign-url', {
        method: 'POST',
        body: JSON.stringify({ campaignId: scope.campaignId, url }),
      })
      if (!res.ok) throw new Error(await res.text())
      const json = (await res.json()) as { jobId?: string; id?: string }
      return { jobId: json.jobId ?? json.id }
    }
    const res = await apiFetch('/api/brain/import-jobs/campaign-file', {
      method: 'POST',
      body: JSON.stringify({
        campaignId: scope.campaignId,
        title,
        content: text || `${url}\n\n${capture.title}`,
        sourceType: 'upload',
        mediaType: 'text',
      }),
    })
    if (!res.ok) throw new Error(await res.text())
    const json = (await res.json()) as { jobId?: string; id?: string }
    return { jobId: json.jobId ?? json.id }
  }

  throw new Error('Unknown scope')
}

export async function searchBrain(query: string, brainId?: string, agentId?: string): Promise<unknown> {
  const params = new URLSearchParams({ q: query, limit: '15', mode: 'hybrid' })
  if (brainId) params.set('brainId', brainId)
  if (agentId) params.set('agentId', agentId)
  const res = await apiFetch(`/api/brain/search?${params.toString()}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function listConversations(agentId?: string, campaignId?: string): Promise<unknown[]> {
  const params = new URLSearchParams()
  if (agentId) params.set('agent_id', agentId)
  if (campaignId) params.set('campaign_id', campaignId)
  const qs = params.toString()
  const res = await apiFetch(`/api/conversations${qs ? `?${qs}` : ''}`)
  if (!res.ok) throw new Error(await res.text())
  const data = (await res.json()) as unknown
  return Array.isArray(data) ? data : []
}

export async function createConversation(body: {
  title?: string
  campaign_id?: string
  agent_id?: string
}): Promise<unknown> {
  const res = await apiFetch('/api/conversations', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function fetchConversationMessages(conversationId: string, limit?: number): Promise<unknown[]> {
  const params = new URLSearchParams()
  if (limit != null) params.set('limit', String(limit))
  const qs = params.toString()
  const res = await apiFetch(`/api/conversations/${conversationId}/messages${qs ? `?${qs}` : ''}`)
  if (!res.ok) throw new Error(await res.text())
  const data = (await res.json()) as unknown
  return Array.isArray(data) ? data : []
}

export async function listMissions(query: {
  status?: string
  campaign_id?: string
  limit?: number
}): Promise<unknown[]> {
  const params = new URLSearchParams()
  if (query.status) params.set('status', query.status)
  if (query.campaign_id) params.set('campaign_id', query.campaign_id)
  if (query.limit != null) params.set('limit', String(query.limit))
  const qs = params.toString()
  const res = await apiFetch(`/api/missions${qs ? `?${qs}` : ''}`)
  if (!res.ok) throw new Error(await res.text())
  const data = (await res.json()) as unknown
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object' && 'missions' in data && Array.isArray((data as { missions: unknown }).missions)) {
    return (data as { missions: unknown[] }).missions
  }
  return []
}

export async function fetchMyOrgs(): Promise<OrgMembership[]> {
  const res = await apiFetch('/api/org/my')
  if (!res.ok) throw new Error(await res.text())
  const json = (await res.json()) as { success: boolean; memberships: OrgMembership[] }
  return json.memberships ?? []
}

export async function syncBrowserCookies(
  domain: string,
  cookies: BrowserSessionCookie[],
): Promise<boolean> {
  const res = await apiFetch('/api/browser-sessions/sync', {
    method: 'POST',
    body: JSON.stringify({ domain, cookies }),
  })
  if (!res.ok) throw new Error(await res.text())
  const json = (await res.json()) as { ok?: boolean }
  return Boolean(json.ok)
}

export interface BrowserSessionSummary {
  domain: string
  cookie_count: number
  synced_at: string
  first_synced_at: string | null
  min_expires_at: string | null
  disabled_at: string | null
}

export async function listBrowserSessions(): Promise<BrowserSessionSummary[]> {
  const res = await apiFetch('/api/browser-sessions')
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text)
  }
  const json = (await res.json()) as { ok?: boolean; sessions?: BrowserSessionSummary[] }
  return json.sessions ?? []
}

export async function deleteBrowserSession(domain: string): Promise<boolean> {
  const res = await apiFetch(`/api/browser-sessions/${encodeURIComponent(domain)}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error(await res.text())
  const json = (await res.json()) as { ok?: boolean }
  return Boolean(json.ok)
}

export async function setDomainDisabled(domain: string, disabled: boolean): Promise<boolean> {
  const res = await apiFetch(`/api/browser-sessions/${encodeURIComponent(domain)}`, {
    method: 'PATCH',
    body: JSON.stringify({ disabled }),
  })
  if (!res.ok) throw new Error(await res.text())
  const json = (await res.json()) as { ok?: boolean }
  return Boolean(json.ok)
}

export async function fetchDomainConfig(): Promise<string[]> {
  const res = await apiFetch('/api/browser-sessions/config')
  if (!res.ok) throw new Error(await res.text())
  const json = (await res.json()) as { ok?: boolean; domains?: string[] }
  return json.domains ?? []
}

export async function getConsentStatus(): Promise<string | null> {
  const res = await apiFetch('/api/browser-sessions/consent')
  if (!res.ok) throw new Error(await res.text())
  const json = (await res.json()) as { ok?: boolean; consent_at?: string | null }
  return json.consent_at ?? null
}

export async function transcribeAudio(audioBase64: string, mimeType: string): Promise<string> {
  const base = getApiOrigin()
  const session = await getCachedOrRefreshSession()
  if (!session) {
    throw new Error('Not signed in — open the Vibey app and log in, then try again.')
  }
  const orgId = await getActiveOrgId()
  const url = `${base.replace(/\/$/, '')}/api/transcribe/file`

  const binary = atob(audioBase64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  const blob = new Blob([bytes], { type: mimeType || 'audio/webm' })
  const ext = mimeType.includes('mp4')
    ? 'mp4'
    : mimeType.includes('ogg')
      ? 'ogg'
      : mimeType.includes('wav')
        ? 'wav'
        : 'webm'
  const form = new FormData()
  form.append('audio', blob, `recording.${ext}`)

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      ...(orgId ? { 'x-org-id': orgId } : {}),
    },
    body: form,
  })
  if (!res.ok) throw new Error(await res.text())
  const json = (await res.json()) as { success?: boolean; text?: string; error?: string }
  if (!json.success || !json.text) throw new Error(json.error || 'Transcription failed')
  return json.text
}

export async function recordConsent(): Promise<string | null> {
  const res = await apiFetch('/api/browser-sessions/consent', { method: 'POST' })
  if (!res.ok) throw new Error(await res.text())
  const json = (await res.json()) as { ok?: boolean; consent_at?: string | null }
  return json.consent_at ?? null
}

export async function listQueue(brainId?: string, campaignId?: string): Promise<unknown[]> {
  const params = new URLSearchParams()
  if (brainId) params.set('brainId', brainId)
  if (campaignId) params.set('campaignId', campaignId)
  const qs = params.toString()
  const res = await apiFetch(`/api/brain/import-jobs/active${qs ? `?${qs}` : ''}`)
  if (!res.ok) throw new Error(await res.text())
  const json = (await res.json()) as { jobs?: unknown[] }
  return json.jobs ?? []
}

export async function fetchLlmModels(): Promise<LlmModelOption[]> {
  const res = await apiFetch('/api/models')
  if (!res.ok) throw new Error(await res.text())
  return (await res.json()) as LlmModelOption[]
}
