import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import {
  normalizePageGraderBaseUrl,
  pageGraderErrorMessage,
  pageGraderHttp,
  requirePageGraderJson,
  throwPageGrader,
} from './page-grader.integration.http'
import {
  isPageGraderMetaContext,
  type PageGraderAssignee,
  type PageGraderClient,
  type PageGraderClientCampaign,
  type PageGraderClientPackage,
  type PageGraderClientWorkspace,
  type PageGraderLaunch,
  type PageGraderMeetingAgendaResult,
  type PageGraderMeetingAgendaWrite,
  type PageGraderMeetingPrepContext,
  type PageGraderMeetingResult,
  type PageGraderMeetingUpsert,
  type PageGraderMetaContext,
  type PageGraderQcActionResult,
  type PageGraderTaskType,
  type PageGraderWorkResult,
} from './page-grader.integration.types'

export * from './page-grader.integration.types'

@Injectable()
export class PageGraderIntegration {
  private readonly logger = new Logger(PageGraderIntegration.name)

  async healthCheck(baseUrl: string, apiKey: string): Promise<{ ok: boolean }> {
    const result = await pageGraderHttp(`${normalizePageGraderBaseUrl(baseUrl)}/me`, apiKey)
    if (!result.ok) throwPageGrader('The ROAS Portal connection failed', result)
    return { ok: true }
  }

  async applyQcAction(
    baseUrl: string,
    apiKey: string,
    findingId: string,
    payload: {
      action: 'acknowledge' | 'resolve' | 'snooze_tomorrow'
      slack_user_id: string
      slack_user_name?: string
    },
  ): Promise<PageGraderQcActionResult> {
    const url = `${normalizePageGraderBaseUrl(baseUrl)}/qc/findings/${encodeURIComponent(findingId)}/actions`
    const body = await requirePageGraderJson(url, apiKey, 'Page Grader QC action failed', {
      method: 'POST',
      body: payload,
    })
    return body as PageGraderQcActionResult
  }

  async listClients(
    baseUrl: string,
    apiKey: string,
    opts?: {
      q?: string
      limit?: number
      offset?: number
      includeInactive?: boolean
      includeAllStatuses?: boolean
    },
  ): Promise<PageGraderClient[]> {
    const params = new URLSearchParams()
    if (opts?.q?.trim()) params.set('q', opts.q.trim())
    if (opts?.limit != null) params.set('limit', String(opts.limit))
    if (opts?.offset != null) params.set('offset', String(opts.offset))
    const root = normalizePageGraderBaseUrl(baseUrl)
    const withFlags = new URLSearchParams(params)
    // Portal's default listing is active-only. Agency Clients needs intake/pre-launch
    // plus a later UI hide for inactive/blocked/churned, so ask for every pipeline stage.
    if (opts?.includeAllStatuses !== false) withFlags.set('include_all_statuses', 'true')
    if (opts?.includeInactive !== false) withFlags.set('include_inactive', 'true')
    const flaggedQs = withFlags.toString()
    const flaggedUrl = `${root}/clients${flaggedQs ? `?${flaggedQs}` : ''}`
    let result = await pageGraderHttp(flaggedUrl, apiKey)
    const usedFlags = withFlags.has('include_all_statuses') || withFlags.has('include_inactive')
    if (!result.ok && usedFlags && (result.status === 400 || result.status === 422)) {
      this.logger.warn(
        `Portal rejected all-status client list flags (${result.status}); retrying without them`,
      )
      const qs = params.toString()
      result = await pageGraderHttp(`${root}/clients${qs ? `?${qs}` : ''}`, apiKey)
    }
    if (!result.ok) throwPageGrader('The ROAS Portal client list failed', result)
    return Array.isArray(result.body.clients) ? (result.body.clients as PageGraderClient[]) : []
  }

  async getClientWorkspace(
    baseUrl: string,
    apiKey: string,
    clientId: string,
  ): Promise<PageGraderClientWorkspace> {
    const url = `${normalizePageGraderBaseUrl(baseUrl)}/clients/${encodeURIComponent(clientId)}/workspace`
    const body = await requirePageGraderJson(
      url,
      apiKey,
      'The ROAS Portal workspace request failed',
    )
    const workspace = body.workspace
    if (!workspace || typeof workspace !== 'object' || Array.isArray(workspace)) {
      throw new BadRequestException('The ROAS Portal client workspace response was invalid')
    }
    return workspace as PageGraderClientWorkspace
  }

  async listClientCampaigns(
    baseUrl: string,
    apiKey: string,
    opts?: { q?: string; clientId?: string; limit?: number; offset?: number },
  ): Promise<PageGraderClientCampaign[]> {
    const params = new URLSearchParams()
    if (opts?.q?.trim()) params.set('q', opts.q.trim())
    if (opts?.clientId?.trim()) params.set('client_id', opts.clientId.trim())
    if (opts?.limit) params.set('limit', String(opts.limit))
    if (opts?.offset) params.set('offset', String(opts.offset))
    const url = `${normalizePageGraderBaseUrl(baseUrl)}/client-campaigns${params.size ? `?${params}` : ''}`
    const body = await requirePageGraderJson(
      url,
      apiKey,
      'The ROAS Portal workspace request failed',
    )
    return Array.isArray(body.campaigns) ? (body.campaigns as PageGraderClientCampaign[]) : []
  }

  async listLaunches(
    baseUrl: string,
    apiKey: string,
    opts?: {
      q?: string
      clientId?: string
      kind?: string
      from?: string
      to?: string
      limit?: number
      offset?: number
    },
  ): Promise<PageGraderLaunch[]> {
    const params = new URLSearchParams()
    if (opts?.q?.trim()) params.set('q', opts.q.trim())
    if (opts?.clientId?.trim()) params.set('client_id', opts.clientId.trim())
    if (opts?.kind?.trim()) params.set('kind', opts.kind.trim())
    if (opts?.from?.trim()) params.set('from', opts.from.trim())
    if (opts?.to?.trim()) params.set('to', opts.to.trim())
    if (opts?.limit) params.set('limit', String(opts.limit))
    if (opts?.offset) params.set('offset', String(opts.offset))
    const url = `${normalizePageGraderBaseUrl(baseUrl)}/launches${params.size ? `?${params}` : ''}`
    const body = await requirePageGraderJson(
      url,
      apiKey,
      'The ROAS Portal workspace request failed',
    )
    if (Array.isArray(body.launches)) return body.launches as PageGraderLaunch[]
    if (Array.isArray(body.items)) return body.items as PageGraderLaunch[]
    return []
  }

  async updateWorkspaceEntity(
    baseUrl: string,
    apiKey: string,
    path: string,
    patch: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const url = `${normalizePageGraderBaseUrl(baseUrl)}${path}`
    return requirePageGraderJson(url, apiKey, 'The ROAS Portal workspace request failed', {
      method: 'PATCH',
      body: patch,
    })
  }

  async listTaskTypes(baseUrl: string, apiKey: string): Promise<PageGraderTaskType[]> {
    const url = `${normalizePageGraderBaseUrl(baseUrl)}/task-types`
    const body = await requirePageGraderJson(url, apiKey, 'The ROAS Portal task type list failed')
    if (!Array.isArray(body.task_types)) return []
    return body.task_types.filter(
      (row): row is PageGraderTaskType =>
        Boolean(row) &&
        typeof (row as PageGraderTaskType).id === 'string' &&
        Boolean((row as PageGraderTaskType).id.trim()) &&
        typeof (row as PageGraderTaskType).label === 'string' &&
        Boolean((row as PageGraderTaskType).label.trim()),
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
    const url = `${normalizePageGraderBaseUrl(baseUrl)}/assignees${qs ? `?${qs}` : ''}`
    const body = await requirePageGraderJson(url, apiKey, 'The ROAS Portal assignee list failed')
    if (!Array.isArray(body.assignees)) return []
    return body.assignees.filter(
      (row): row is PageGraderAssignee =>
        Boolean(row) &&
        typeof (row as PageGraderAssignee).id === 'string' &&
        Boolean((row as PageGraderAssignee).id.trim()) &&
        typeof (row as PageGraderAssignee).name === 'string',
    )
  }

  async createDelegationPreview(
    baseUrl: string,
    apiKey: string,
    payload: Record<string, unknown>,
  ): Promise<{
    delegation_id: string
    confirm_url: string
    tasks: unknown[]
    campaign_id: string | null
  }> {
    const url = `${normalizePageGraderBaseUrl(baseUrl)}/delegations`
    const body = await requirePageGraderJson(
      url,
      apiKey,
      'The ROAS Portal could not parse the fulfillment batch',
      { method: 'POST', body: payload },
    )
    const delegationId = typeof body.delegation_id === 'string' ? body.delegation_id : ''
    const confirmUrl = typeof body.confirm_url === 'string' ? body.confirm_url : ''
    if (!delegationId || !confirmUrl) {
      throw new BadRequestException('The ROAS Portal did not return a confirm URL')
    }
    return {
      delegation_id: delegationId,
      confirm_url: confirmUrl,
      tasks: Array.isArray(body.tasks) ? body.tasks : [],
      campaign_id: typeof body.campaign_id === 'string' ? body.campaign_id : null,
    }
  }

  async createWork(
    baseUrl: string,
    apiKey: string,
    payload: Record<string, unknown>,
  ): Promise<{ work: PageGraderWorkResult; status: number }> {
    const url = `${normalizePageGraderBaseUrl(baseUrl)}/work`
    const result = await pageGraderHttp(url, apiKey, { method: 'POST', body: payload })
    if (!result.ok) {
      this.logger.warn(
        `Page Grader create work failed: ${result.status} ${pageGraderErrorMessage(result)}`,
      )
      throwPageGrader('The ROAS Portal could not create the work', result)
    }
    const work = result.body.work as PageGraderWorkResult | undefined
    if (!work?.id) throw new BadRequestException('The ROAS Portal did not return a work ID')
    return { work, status: result.status }
  }

  async upsertClientMeeting(
    baseUrl: string,
    apiKey: string,
    clientId: string,
    payload: PageGraderMeetingUpsert,
  ): Promise<{ meeting: PageGraderMeetingResult; created: boolean; unchanged: boolean }> {
    const url = `${normalizePageGraderBaseUrl(baseUrl)}/clients/${encodeURIComponent(clientId)}/meetings`
    const body = await requirePageGraderJson(url, apiKey, 'The ROAS Portal meeting sync failed', {
      method: 'POST',
      body: payload,
    })
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
    const url = `${normalizePageGraderBaseUrl(baseUrl)}/clients/${encodeURIComponent(id)}/meeting-prep-context${qs ? `?${qs}` : ''}`
    const body = await requirePageGraderJson(
      url,
      apiKey,
      'The ROAS Portal meeting prep context failed',
    )
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
    const url = `${normalizePageGraderBaseUrl(baseUrl)}/clients/${encodeURIComponent(id)}/meeting-agenda`
    const body = await requirePageGraderJson(
      url,
      apiKey,
      'The ROAS Portal meeting agenda write failed',
      { method: 'POST', body: payload },
    )
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
    const url = `${normalizePageGraderBaseUrl(baseUrl)}/clients/${encodeURIComponent(id)}/brain-package`
    const body = await requirePageGraderJson(
      url,
      apiKey,
      'The ROAS Portal client package fetch failed',
    )
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
    const url = `${normalizePageGraderBaseUrl(baseUrl)}/clients/${encodeURIComponent(id)}/meta-context`
    const body = await requirePageGraderJson(
      url,
      apiKey,
      'The ROAS Portal Meta context fetch failed',
    )
    const context = body.meta_context
    if (!isPageGraderMetaContext(context)) {
      throw new BadRequestException('The ROAS Portal Meta context response was invalid')
    }
    return context
  }
}
