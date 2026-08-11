import { BadRequestException, Injectable, Logger } from '@nestjs/common'

export type PageGraderClient = {
  id: string
  name: string
  status: string
}

export type PageGraderWorkResult = {
  id: string
  kind: string
  client_id: string
  url: string
  clickup_task_id?: string | null
  clickup_task_url?: string | null
  assignee_resolution: Array<{
    email: string
    status: 'mapped' | 'unmapped'
    page_grader_user_id?: string
  }>
}

export type PageGraderTaskType = {
  id: string
  label: string
  hint: string
}

export type PageGraderAssignee = {
  id: string
  name: string
  email: string | null
}

export type PageGraderClientPackage = Record<string, unknown>

export type PageGraderMetaContext = {
  client: { id: string; name: string }
  connected: boolean
  accounts: Array<{
    mapping_id: string | null
    account_db_id: string | null
    ad_account_id: string
    name: string | null
    currency: string | null
    timezone: string | null
    account_status: number | null
    active: boolean
    last_synced_at: string | null
    sync_error: string | null
    notes: string | null
  }>
  recommended_ad_account_id: string | null
  pages: Array<Record<string, unknown>>
  pixels: Array<Record<string, unknown>>
  campaigns: Array<Record<string, unknown>>
  provenance: { source: 'page_grader'; generated_at: string }
}

export type PageGraderMeetingUpsert = {
  source_meeting_id: string
  meeting_title: string
  meeting_date: string
  meeting_duration_minutes?: number | null
  attendees?: Array<Record<string, unknown>>
  source_url?: string | null
  transcript?: string | null
  summary?: string | null
  ai_summary?: string | null
  action_items?: Array<Record<string, unknown>>
  roas_space_id?: string | null
  roas_space_item_id?: string | null
  matched_by?: string
  sync_hash?: string
}

export type PageGraderMeetingResult = {
  id: string
  client_id: string
  meeting_title?: string
  meeting_date?: string
  source_url?: string | null
}

export type PageGraderAgendaSections = {
  agenda: string
  performance?: string
  performance_data?: string
  wins: string
  campaign_notes?: string
  campaignNotes?: string
  other_updates?: string
  otherUpdates?: string
  needs_blockers?: string
  needsBlockers?: string
}

export type PageGraderMeetingAgendaWrite = {
  meeting_date: string
  sections: PageGraderAgendaSections
  insert_ad_previews?: boolean
  roas_prep_item_id?: string | null
  notes?: string | null
}

export type PageGraderMeetingAgendaResult = {
  doc_id: string | null
  doc_link: string | null
  tab_id: string | null
  tab_name: string | null
  meeting_agenda_id: string | null
  source?: string | null
}

export type PageGraderMeetingPrepContext = Record<string, unknown>

export type PageGraderEmbedSession = {
  code: string
  embed_url: string
  expires_at: string
}

@Injectable()
export class PageGraderIntegration {
  private readonly logger = new Logger(PageGraderIntegration.name)

  private normalizeBaseUrl(baseUrl: string): string {
    return baseUrl.trim().replace(/\/+$/, '')
  }

  private authHeaders(apiKey: string): Record<string, string> {
    return {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    }
  }

  async healthCheck(baseUrl: string, apiKey: string): Promise<{ ok: boolean }> {
    const url = `${this.normalizeBaseUrl(baseUrl)}/me`
    const res = await fetch(url, { headers: this.authHeaders(apiKey) })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new BadRequestException(
        `The ROAS Portal connection failed (${res.status}): ${text || res.statusText}`,
      )
    }
    return { ok: true }
  }

  async listClients(
    baseUrl: string,
    apiKey: string,
    opts?: { q?: string; limit?: number; offset?: number },
  ): Promise<PageGraderClient[]> {
    const params = new URLSearchParams()
    if (opts?.q?.trim()) params.set('q', opts.q.trim())
    if (opts?.limit != null) params.set('limit', String(opts.limit))
    if (opts?.offset != null) params.set('offset', String(opts.offset))
    const qs = params.toString()
    const url = `${this.normalizeBaseUrl(baseUrl)}/clients${qs ? `?${qs}` : ''}`
    const res = await fetch(url, { headers: this.authHeaders(apiKey) })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new BadRequestException(
        `The ROAS Portal client list failed (${res.status}): ${text || res.statusText}`,
      )
    }
    const body = (await res.json()) as { clients?: PageGraderClient[] }
    return Array.isArray(body.clients) ? body.clients : []
  }

  async listTaskTypes(baseUrl: string, apiKey: string): Promise<PageGraderTaskType[]> {
    const url = `${this.normalizeBaseUrl(baseUrl)}/task-types`
    const res = await fetch(url, { headers: this.authHeaders(apiKey) })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new BadRequestException(
        `The ROAS Portal task type list failed (${res.status}): ${text || res.statusText}`,
      )
    }
    const body = (await res.json()) as { task_types?: PageGraderTaskType[] }
    if (!Array.isArray(body.task_types)) return []
    return body.task_types.filter(
      (row): row is PageGraderTaskType =>
        Boolean(row) &&
        typeof row.id === 'string' &&
        Boolean(row.id.trim()) &&
        typeof row.label === 'string' &&
        Boolean(row.label.trim()),
    )
  }

  async listAssignees(
    baseUrl: string,
    apiKey: string,
    opts?: { q?: string; limit?: number },
  ): Promise<PageGraderAssignee[]> {
    const params = new URLSearchParams()
    if (opts?.q?.trim()) params.set('q', opts.q.trim())
    if (opts?.limit) params.set('limit', String(opts.limit))
    const qs = params.toString()
    const url = `${this.normalizeBaseUrl(baseUrl)}/assignees${qs ? `?${qs}` : ''}`
    const res = await fetch(url, { headers: this.authHeaders(apiKey) })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new BadRequestException(
        `The ROAS Portal assignee list failed (${res.status}): ${text || res.statusText}`,
      )
    }
    const body = (await res.json()) as { assignees?: PageGraderAssignee[] }
    if (!Array.isArray(body.assignees)) return []
    return body.assignees.filter(
      (row): row is PageGraderAssignee =>
        Boolean(row) &&
        typeof row.id === 'string' &&
        Boolean(row.id.trim()) &&
        typeof row.name === 'string',
    )
  }

  async createEmbedSession(
    baseUrl: string,
    apiKey: string,
    input: { email: string; parentOrigin: string; targetPath: string },
  ): Promise<PageGraderEmbedSession> {
    const url = `${this.normalizeBaseUrl(baseUrl)}/embed/sessions`
    const res = await fetch(url, {
      method: 'POST',
      headers: this.authHeaders(apiKey),
      body: JSON.stringify({
        email: input.email,
        parent_origin: input.parentOrigin,
        target_path: input.targetPath,
      }),
    })
    const text = await res.text().catch(() => '')
    let body: Record<string, unknown> = {}
    try {
      body = text ? (JSON.parse(text) as Record<string, unknown>) : {}
    } catch {
      body = { error: text }
    }
    if (!res.ok) {
      const message =
        typeof body.error === 'string' ? body.error : text || res.statusText || 'Request failed'
      throw new BadRequestException(
        `The ROAS Portal sign-in could not be prepared (${res.status}): ${message}`,
      )
    }
    if (
      typeof body.code !== 'string' ||
      typeof body.embed_url !== 'string' ||
      typeof body.expires_at !== 'string'
    ) {
      throw new BadRequestException('The ROAS Portal returned an invalid sign-in handoff')
    }
    return {
      code: body.code,
      embed_url: body.embed_url,
      expires_at: body.expires_at,
    }
  }

  async createWork(
    baseUrl: string,
    apiKey: string,
    payload: Record<string, unknown>,
  ): Promise<{ work: PageGraderWorkResult; status: number }> {
    const url = `${this.normalizeBaseUrl(baseUrl)}/work`
    const res = await fetch(url, {
      method: 'POST',
      headers: this.authHeaders(apiKey),
      body: JSON.stringify(payload),
    })
    const text = await res.text().catch(() => '')
    let body: Record<string, unknown> = {}
    try {
      body = text ? (JSON.parse(text) as Record<string, unknown>) : {}
    } catch {
      body = { error: text }
    }
    if (!res.ok) {
      const errMsg =
        typeof body.error === 'string' ? body.error : text || res.statusText || 'Request failed'
      this.logger.warn(`Page Grader create work failed: ${res.status} ${errMsg}`)
      throw new BadRequestException(
        `The ROAS Portal could not create the work (${res.status}): ${errMsg}`,
      )
    }
    const work = body.work as PageGraderWorkResult | undefined
    if (!work?.id) {
      throw new BadRequestException('The ROAS Portal did not return a work ID')
    }
    return { work, status: res.status }
  }

  async upsertClientMeeting(
    baseUrl: string,
    apiKey: string,
    clientId: string,
    payload: PageGraderMeetingUpsert,
  ): Promise<{ meeting: PageGraderMeetingResult; created: boolean; unchanged: boolean }> {
    const url = `${this.normalizeBaseUrl(baseUrl)}/clients/${encodeURIComponent(clientId)}/meetings`
    const res = await fetch(url, {
      method: 'POST',
      headers: this.authHeaders(apiKey),
      body: JSON.stringify(payload),
    })
    const text = await res.text().catch(() => '')
    let body: Record<string, unknown> = {}
    try {
      body = text ? (JSON.parse(text) as Record<string, unknown>) : {}
    } catch {
      body = { error: text }
    }
    if (!res.ok) {
      const message =
        typeof body.error === 'string' ? body.error : text || res.statusText || 'Request failed'
      throw new BadRequestException(
        `The ROAS Portal meeting sync failed (${res.status}): ${message}`,
      )
    }
    const meeting = body.meeting as PageGraderMeetingResult | undefined
    if (!meeting?.id)
      throw new BadRequestException('The ROAS Portal meeting sync returned no meeting ID')
    return {
      meeting,
      created: body.created === true,
      unchanged: body.unchanged === true,
    }
  }

  async getMeetingPrepContext(
    baseUrl: string,
    apiKey: string,
    clientId: string,
    meetingDate?: string | null,
  ): Promise<PageGraderMeetingPrepContext> {
    const id = clientId.trim()
    if (!id) throw new BadRequestException('The ROAS Portal client ID is required')
    const params = new URLSearchParams()
    if (meetingDate?.trim()) params.set('meeting_date', meetingDate.trim())
    const qs = params.toString()
    const url = `${this.normalizeBaseUrl(baseUrl)}/clients/${encodeURIComponent(id)}/meeting-prep-context${qs ? `?${qs}` : ''}`
    const res = await fetch(url, { headers: this.authHeaders(apiKey) })
    const text = await res.text().catch(() => '')
    let body: Record<string, unknown> = {}
    try {
      body = text ? (JSON.parse(text) as Record<string, unknown>) : {}
    } catch {
      body = { error: text }
    }
    if (!res.ok) {
      const message =
        typeof body.error === 'string' ? body.error : text || res.statusText || 'Request failed'
      throw new BadRequestException(
        `The ROAS Portal meeting prep context failed (${res.status}): ${message}`,
      )
    }
    const pack = body.prep_context
    if (!pack || typeof pack !== 'object' || Array.isArray(pack)) {
      throw new BadRequestException('The ROAS Portal meeting prep context was empty')
    }
    return pack as PageGraderMeetingPrepContext
  }

  async writeMeetingAgenda(
    baseUrl: string,
    apiKey: string,
    clientId: string,
    payload: PageGraderMeetingAgendaWrite,
  ): Promise<PageGraderMeetingAgendaResult> {
    const id = clientId.trim()
    if (!id) throw new BadRequestException('The ROAS Portal client ID is required')
    const url = `${this.normalizeBaseUrl(baseUrl)}/clients/${encodeURIComponent(id)}/meeting-agenda`
    const res = await fetch(url, {
      method: 'POST',
      headers: this.authHeaders(apiKey),
      body: JSON.stringify(payload),
    })
    const text = await res.text().catch(() => '')
    let body: Record<string, unknown> = {}
    try {
      body = text ? (JSON.parse(text) as Record<string, unknown>) : {}
    } catch {
      body = { error: text }
    }
    if (!res.ok) {
      const message =
        typeof body.error === 'string' ? body.error : text || res.statusText || 'Request failed'
      throw new BadRequestException(
        `The ROAS Portal meeting agenda write failed (${res.status}): ${message}`,
      )
    }
    return {
      doc_id: typeof body.doc_id === 'string' ? body.doc_id : null,
      doc_link: typeof body.doc_link === 'string' ? body.doc_link : null,
      tab_id: typeof body.tab_id === 'string' ? body.tab_id : null,
      tab_name: typeof body.tab_name === 'string' ? body.tab_name : null,
      meeting_agenda_id: typeof body.meeting_agenda_id === 'string' ? body.meeting_agenda_id : null,
      source: typeof body.source === 'string' ? body.source : null,
    }
  }

  async getClientBrainPackage(
    baseUrl: string,
    apiKey: string,
    clientId: string,
  ): Promise<PageGraderClientPackage> {
    const id = clientId.trim()
    if (!id) throw new BadRequestException('The ROAS Portal client ID is required')
    const url = `${this.normalizeBaseUrl(baseUrl)}/clients/${encodeURIComponent(id)}/brain-package`
    const res = await fetch(url, { headers: this.authHeaders(apiKey) })
    const text = await res.text().catch(() => '')
    let body: Record<string, unknown> = {}
    try {
      body = text ? (JSON.parse(text) as Record<string, unknown>) : {}
    } catch {
      body = { error: text }
    }
    if (!res.ok) {
      const errMsg =
        typeof body.error === 'string' ? body.error : text || res.statusText || 'Request failed'
      throw new BadRequestException(
        `The ROAS Portal client package fetch failed (${res.status}): ${errMsg}`,
      )
    }
    const pkg = body.package
    if (!pkg || typeof pkg !== 'object' || Array.isArray(pkg)) {
      throw new BadRequestException('The ROAS Portal client package response was empty')
    }
    return pkg as PageGraderClientPackage
  }

  async getClientMetaContext(
    baseUrl: string,
    apiKey: string,
    clientId: string,
  ): Promise<PageGraderMetaContext> {
    const id = clientId.trim()
    if (!id) throw new BadRequestException('The ROAS Portal client ID is required')
    const url = `${this.normalizeBaseUrl(baseUrl)}/clients/${encodeURIComponent(id)}/meta-context`
    const res = await fetch(url, { headers: this.authHeaders(apiKey) })
    const text = await res.text().catch(() => '')
    let body: Record<string, unknown> = {}
    try {
      body = text ? (JSON.parse(text) as Record<string, unknown>) : {}
    } catch {
      body = { error: text }
    }
    if (!res.ok) {
      const errMsg =
        typeof body.error === 'string' ? body.error : text || res.statusText || 'Request failed'
      throw new BadRequestException(
        `The ROAS Portal Meta context fetch failed (${res.status}): ${errMsg}`,
      )
    }
    const context = body.meta_context
    if (!isPageGraderMetaContext(context)) {
      throw new BadRequestException('The ROAS Portal Meta context response was invalid')
    }
    return context
  }
}

function isPageGraderMetaContext(value: unknown): value is PageGraderMetaContext {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const row = value as Record<string, unknown>
  const client = row.client as Record<string, unknown> | undefined
  const provenance = row.provenance as Record<string, unknown> | undefined
  return (
    typeof client?.id === 'string' &&
    typeof client.name === 'string' &&
    typeof row.connected === 'boolean' &&
    Array.isArray(row.accounts) &&
    row.accounts.every(
      (account) =>
        account &&
        typeof account === 'object' &&
        !Array.isArray(account) &&
        typeof (account as Record<string, unknown>).ad_account_id === 'string' &&
        typeof (account as Record<string, unknown>).active === 'boolean',
    ) &&
    (row.recommended_ad_account_id === null || typeof row.recommended_ad_account_id === 'string') &&
    Array.isArray(row.pages) &&
    Array.isArray(row.pixels) &&
    Array.isArray(row.campaigns) &&
    provenance?.source === 'page_grader' &&
    typeof provenance.generated_at === 'string'
  )
}
