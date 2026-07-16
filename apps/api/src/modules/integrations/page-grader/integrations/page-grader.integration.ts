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
        `Page Grader connection failed (${res.status}): ${text || res.statusText}`,
      )
    }
    return { ok: true }
  }

  async listClients(
    baseUrl: string,
    apiKey: string,
    opts?: { q?: string; limit?: number },
  ): Promise<PageGraderClient[]> {
    const params = new URLSearchParams()
    if (opts?.q?.trim()) params.set('q', opts.q.trim())
    if (opts?.limit) params.set('limit', String(opts.limit))
    const qs = params.toString()
    const url = `${this.normalizeBaseUrl(baseUrl)}/clients${qs ? `?${qs}` : ''}`
    const res = await fetch(url, { headers: this.authHeaders(apiKey) })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new BadRequestException(
        `Page Grader list clients failed (${res.status}): ${text || res.statusText}`,
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
        `Page Grader list task types failed (${res.status}): ${text || res.statusText}`,
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
        `Page Grader list assignees failed (${res.status}): ${text || res.statusText}`,
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
      throw new BadRequestException(`Page Grader create work failed (${res.status}): ${errMsg}`)
    }
    const work = body.work as PageGraderWorkResult | undefined
    if (!work?.id) throw new BadRequestException('Page Grader create work returned no work id')
    return { work, status: res.status }
  }
}
