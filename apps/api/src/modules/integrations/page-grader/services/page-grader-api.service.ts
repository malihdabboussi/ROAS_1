import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ConfigService } from '@nestjs/config'
import { SupabaseServiceClient } from '@vibey/api-shared'
import { VaultService } from '../../../vault/services/vault.service'
import { SpacesService } from '../../../spaces/services/spaces.service'
import { IntegrationConnectionsRepository } from '../../repositories/integration-connections.repository'
import type {
  ListPageGraderAssigneesDto,
  ListPageGraderClientsDto,
  SendPageGraderWorkDto,
  UpsertPageGraderClientScopeMapDto,
} from '../dto/page-grader.dto'

export type PageGraderClientScopeEntry = {
  campaign_id: string
  campaign_name?: string
  space_id?: string | null
  space_title?: string | null
}
import { PageGraderIntegration } from '../integrations/page-grader.integration'

const PROVIDER = 'page_grader'
const LABEL_BASE_URL = 'base_url'
const LABEL_API_KEY = 'api_key'

export type PageGraderSendResult = {
  space_item_id: string
  status: 'created' | 'skipped_already_sent' | 'failed'
  work_id?: string
  work_url?: string
  error?: string
}

@Injectable()
export class PageGraderApiService {
  private readonly logger = new Logger(PageGraderApiService.name)

  constructor(
    private readonly pageGrader: PageGraderIntegration,
    private readonly vault: VaultService,
    private readonly connections: IntegrationConnectionsRepository,
    private readonly spaces: SpacesService,
    private readonly svc: SupabaseServiceClient,
    private readonly config: ConfigService,
  ) {}

  private async getCreds(userId: string) {
    const [baseUrl, apiKey] = await Promise.all([
      this.vault.getSecret(userId, PROVIDER, LABEL_BASE_URL),
      this.vault.getSecret(userId, PROVIDER, LABEL_API_KEY),
    ])
    if (!baseUrl || !apiKey) throw new BadRequestException('Page Grader is not connected')
    return { baseUrl, apiKey }
  }

  async connect(userId: string, baseUrl: string, apiKey: string) {
    await this.pageGrader.healthCheck(baseUrl, apiKey)

    await Promise.all([
      this.vault.storeSecret(userId, PROVIDER, LABEL_BASE_URL, baseUrl, 'custom', {}),
      this.vault.storeSecret(userId, PROVIDER, LABEL_API_KEY, apiKey, 'api_key', {}),
    ])

    // Catalog parent must exist before user_integrations insert (FK).
    await this.connections.ensureAvailable({
      id: PROVIDER,
      provider: PROVIDER,
      name: 'Page Grader',
      description:
        'Send Space tasks to Page Grader as workload for client funnel, copy, and design teams.',
      auth_type: 'api_key',
      is_available: true,
      metadata: {
        category: 'productivity',
        website: 'https://portal.roas.io',
      },
    })

    const now = new Date().toISOString()
    await this.connections.upsertConnection(PROVIDER, userId, {
      user_id: userId,
      integration_id: PROVIDER,
      provider: PROVIDER,
      status: 'connected',
      access_token: null,
      refresh_token: null,
      token_expires_at: null,
      connected_at: now,
      error_message: null,
      metadata: { base_url_host: safeHost(baseUrl) },
      updated_at: now,
      scope_mode: 'personal',
    })

    return { connected: true }
  }

  async disconnect(userId: string) {
    await Promise.all([
      this.vault.deleteSecret(userId, PROVIDER, LABEL_BASE_URL),
      this.vault.deleteSecret(userId, PROVIDER, LABEL_API_KEY),
    ])
    await this.connections.markPersonalDisconnected(PROVIDER, userId)
  }

  async getStatus(userId: string) {
    const hasUrl = await this.vault.hasSecret(userId, PROVIDER, LABEL_BASE_URL)
    const hasKey = await this.vault.hasSecret(userId, PROVIDER, LABEL_API_KEY)
    if (!hasUrl || !hasKey) return { connected: false, status: null, baseUrlHost: null }

    const { data } = await this.svc.client
      .from('user_integrations')
      .select('status, connected_at, metadata')
      .eq('user_id', userId)
      .eq('integration_id', PROVIDER)
      .is('org_id', null)
      .maybeSingle()

    const metadata =
      data?.metadata && typeof data.metadata === 'object'
        ? (data.metadata as Record<string, unknown>)
        : {}

    return {
      connected: data?.status === 'connected',
      status: (data?.status as string) ?? null,
      connectedAt: (data?.connected_at as string) ?? null,
      baseUrlHost: typeof metadata.base_url_host === 'string' ? metadata.base_url_host : null,
    }
  }

  async listClients(userId: string, opts: ListPageGraderClientsDto) {
    const creds = await this.getCreds(userId)
    const clients = await this.pageGrader.listClients(creds.baseUrl, creds.apiKey, opts)
    const [clientTagMap, clientScopeMap] = await Promise.all([
      this.readClientTagMap(userId),
      this.readClientScopeMap(userId),
    ])
    return {
      clients,
      client_tag_map: clientTagMap,
      client_scope_map: clientScopeMap,
    }
  }

  async listTaskTypes(userId: string) {
    const creds = await this.getCreds(userId)
    try {
      const taskTypes = await this.pageGrader.listTaskTypes(creds.baseUrl, creds.apiKey)
      if (taskTypes.length > 0) return { task_types: taskTypes }
    } catch (err) {
      this.logger.warn(
        `Page Grader task-types unavailable, using fallback: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
    return { task_types: FALLBACK_PAGE_GRADER_TASK_TYPES }
  }

  async listAssignees(userId: string, opts: ListPageGraderAssigneesDto) {
    const creds = await this.getCreds(userId)
    const assignees = await this.pageGrader.listAssignees(creds.baseUrl, creds.apiKey, opts)
    return { assignees }
  }

  async upsertClientScopeMap(userId: string, dto: UpsertPageGraderClientScopeMapDto) {
    await this.getCreds(userId)
    const next: Record<string, PageGraderClientScopeEntry> = {}
    for (const row of dto.mappings) {
      next[row.client_id] = {
        campaign_id: row.campaign_id,
        ...(row.campaign_name ? { campaign_name: row.campaign_name } : {}),
        space_id: row.space_id ?? null,
        ...(row.space_title ? { space_title: row.space_title } : {}),
      }
    }
    await this.writeClientScopeMap(userId, next)
    return { client_scope_map: next }
  }

  async sendWork(
    supabase: SupabaseClient,
    userId: string,
    dto: SendPageGraderWorkDto,
    orgId?: string | null,
    orgRole?: import('@vibey/api-shared').OrgRole | null,
  ): Promise<{ success: boolean; results: PageGraderSendResult[] }> {
    const creds = await this.getCreds(userId)
    const appUrl = (this.config.get<string>('APP_URL') || 'https://app.roas.io').replace(
      /\/+$/,
      '',
    )
    const workKind = dto.work_kind ?? 'task_request'
    const taskType = dto.task_type
    const results: PageGraderSendResult[] = []

    for (const itemId of dto.space_item_ids) {
      try {
        const item = (await this.spaces.getItem(
          supabase,
          userId,
          dto.space_id,
          itemId,
          orgId,
          orgRole,
        )) as Record<string, unknown>

        const customData =
          item.custom_data && typeof item.custom_data === 'object'
            ? (item.custom_data as Record<string, unknown>)
            : {}
        const existingPg =
          customData.page_grader && typeof customData.page_grader === 'object'
            ? (customData.page_grader as Record<string, unknown>)
            : null

        // Already linked: still call Page Grader create (idempotent) so ClickUp push can retry.
        if (typeof existingPg?.work_id === 'string' && existingPg.work_id.trim()) {
          try {
            const { work } = await this.pageGrader.createWork(creds.baseUrl, creds.apiKey, {
              client_id: dto.client_id,
              source: {
                system: 'roas',
                org_id: orgId ?? null,
                space_id: dto.space_id,
                space_item_id: itemId,
                space_url: `${appUrl}/spaces/${dto.space_id}?item=${itemId}`,
              },
              work: {
                kind: workKind,
                task_type: taskType,
                title: String(item.title ?? '').trim() || 'Untitled task',
                description: '',
                priority: mapRoasPriority(item.priority),
                due_at:
                  typeof dto.due_date === 'string' && dto.due_date.trim()
                    ? dto.due_date.trim().slice(0, 10)
                    : typeof item.due_date === 'string'
                      ? item.due_date
                      : null,
              },
            })
            if (work.url && work.url !== existingPg.work_url) {
              await this.spaces.updateItem(
                supabase,
                userId,
                dto.space_id,
                itemId,
                {
                  custom_data: {
                    page_grader: {
                      ...existingPg,
                      work_id: work.id,
                      work_url: work.url,
                    },
                  },
                },
                orgId,
                orgRole,
              )
            }
            results.push({
              space_item_id: itemId,
              status: 'skipped_already_sent',
              work_id: work.id,
              work_url: work.url,
            })
          } catch (err) {
            results.push({
              space_item_id: itemId,
              status: 'skipped_already_sent',
              work_id: existingPg.work_id,
              work_url: typeof existingPg.work_url === 'string' ? existingPg.work_url : undefined,
              error: err instanceof Error ? err.message : String(err),
            })
          }
          continue
        }

        const parentContext = await this.resolveParentContext(
          supabase,
          userId,
          dto.space_id,
          item,
          orgId,
          orgRole,
        )
        const assignees = dto.assignee
          ? [
              {
                ...(dto.assignee.page_grader_user_id
                  ? { page_grader_user_id: dto.assignee.page_grader_user_id }
                  : {}),
                ...(dto.assignee.email ? { email: dto.assignee.email } : {}),
                ...(dto.assignee.name ? { name: dto.assignee.name } : {}),
              },
            ]
          : await this.resolveAssigneeEmails(item)

        const title = String(item.title ?? '').trim() || 'Untitled task'
        const description = buildDescription(item, parentContext, dto.note)
        const existingTags = Array.isArray(customData.tags)
          ? customData.tags.filter((t): t is string => typeof t === 'string')
          : []
        const nextTags =
          dto.client_tag_id && !existingTags.includes(dto.client_tag_id)
            ? [...existingTags, dto.client_tag_id]
            : existingTags
        const dueAt =
          typeof dto.due_date === 'string' && dto.due_date.trim()
            ? dto.due_date.trim().slice(0, 10)
            : typeof item.due_date === 'string' && item.due_date.trim()
              ? item.due_date.trim().slice(0, 10)
              : null
        const operatorNote = dto.note?.trim() || ''
        const existingNotes = typeof item.notes === 'string' ? item.notes.trim() : ''
        const nextNotes = mergeOperatorNoteIntoNotes(existingNotes, operatorNote)

        const payload = {
          client_id: dto.client_id,
          note: operatorNote || undefined,
          source: {
            system: 'roas',
            org_id: orgId ?? null,
            space_id: dto.space_id,
            space_item_id: itemId,
            space_url: `${appUrl}/spaces/${dto.space_id}?item=${itemId}`,
          },
          work: {
            kind: workKind,
            task_type: taskType,
            title,
            description,
            priority: mapRoasPriority(item.priority),
            due_at: dueAt,
            tags: nextTags,
            assignees,
            context: parentContext,
          },
        }

        const { work, status } = await this.pageGrader.createWork(
          creds.baseUrl,
          creds.apiKey,
          payload,
        )

        const itemPatch: Record<string, unknown> = {
          custom_data: {
            ...(dto.client_tag_id ? { tags: nextTags } : {}),
            page_grader: {
              client_id: dto.client_id,
              work_id: work.id,
              work_kind: work.kind,
              task_type: taskType,
              work_url: work.url,
              sent_at: new Date().toISOString(),
              sent_by_user_id: userId,
              client_tag_id: dto.client_tag_id ?? null,
            },
          },
        }
        if (dueAt && dueAt !== String(item.due_date ?? '').trim().slice(0, 10)) {
          itemPatch.due_date = dueAt
        }
        if (nextNotes !== null && nextNotes !== existingNotes) {
          itemPatch.notes = nextNotes
        }

        await this.spaces.updateItem(
          supabase,
          userId,
          dto.space_id,
          itemId,
          itemPatch,
          orgId,
          orgRole,
        )

        results.push({
          space_item_id: itemId,
          status: status === 200 ? 'skipped_already_sent' : 'created',
          work_id: work.id,
          work_url: work.url,
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        this.logger.warn(`Page Grader send failed for ${itemId}: ${message}`)
        results.push({
          space_item_id: itemId,
          status: 'failed',
          error: message,
        })
      }
    }

    if (
      dto.client_tag_id &&
      dto.client_tag_label &&
      results.some((r) => r.status === 'created' || r.status === 'skipped_already_sent')
    ) {
      await this.rememberClientTag(
        userId,
        dto.client_id,
        dto.client_tag_id,
        dto.client_tag_label,
      ).catch((err) =>
        this.logger.warn(
          `Failed to remember Page Grader client tag map: ${err instanceof Error ? err.message : String(err)}`,
        ),
      )
    }

    return { success: results.every((r) => r.status !== 'failed'), results }
  }

  private async readClientTagMap(
    userId: string,
  ): Promise<Record<string, { tag_id: string; tag_label: string }>> {
    const { data } = await this.svc.client
      .from('user_integrations')
      .select('metadata')
      .eq('user_id', userId)
      .eq('integration_id', PROVIDER)
      .is('org_id', null)
      .maybeSingle()
    const metadata =
      data?.metadata && typeof data.metadata === 'object'
        ? (data.metadata as Record<string, unknown>)
        : {}
    const raw = metadata.client_tag_map
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
    const out: Record<string, { tag_id: string; tag_label: string }> = {}
    for (const [clientId, value] of Object.entries(raw as Record<string, unknown>)) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) continue
      const row = value as Record<string, unknown>
      const tagId = typeof row.tag_id === 'string' ? row.tag_id.trim() : ''
      const tagLabel = typeof row.tag_label === 'string' ? row.tag_label.trim() : ''
      if (!clientId || !tagId || !tagLabel) continue
      out[clientId] = { tag_id: tagId, tag_label: tagLabel }
    }
    return out
  }

  private async rememberClientTag(
    userId: string,
    clientId: string,
    tagId: string,
    tagLabel: string,
  ): Promise<void> {
    const { data } = await this.svc.client
      .from('user_integrations')
      .select('id, metadata')
      .eq('user_id', userId)
      .eq('integration_id', PROVIDER)
      .is('org_id', null)
      .maybeSingle()
    if (!data?.id) return
    const metadata =
      data.metadata && typeof data.metadata === 'object'
        ? (data.metadata as Record<string, unknown>)
        : {}
    const existing =
      metadata.client_tag_map &&
      typeof metadata.client_tag_map === 'object' &&
      !Array.isArray(metadata.client_tag_map)
        ? (metadata.client_tag_map as Record<string, unknown>)
        : {}
    await this.svc.client
      .from('user_integrations')
      .update({
        metadata: {
          ...metadata,
          client_tag_map: {
            ...existing,
            [clientId]: { tag_id: tagId, tag_label: tagLabel },
          },
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.id)
  }

  private async readClientScopeMap(
    userId: string,
  ): Promise<Record<string, PageGraderClientScopeEntry>> {
    const { data } = await this.svc.client
      .from('user_integrations')
      .select('metadata')
      .eq('user_id', userId)
      .eq('integration_id', PROVIDER)
      .is('org_id', null)
      .maybeSingle()
    const metadata =
      data?.metadata && typeof data.metadata === 'object'
        ? (data.metadata as Record<string, unknown>)
        : {}
    return parseClientScopeMap(metadata.client_scope_map)
  }

  private async writeClientScopeMap(
    userId: string,
    next: Record<string, PageGraderClientScopeEntry>,
  ): Promise<void> {
    const { data } = await this.svc.client
      .from('user_integrations')
      .select('id, metadata')
      .eq('user_id', userId)
      .eq('integration_id', PROVIDER)
      .is('org_id', null)
      .maybeSingle()
    if (!data?.id) throw new BadRequestException('Page Grader is not connected')
    const metadata =
      data.metadata && typeof data.metadata === 'object'
        ? (data.metadata as Record<string, unknown>)
        : {}
    const { error } = await this.svc.client
      .from('user_integrations')
      .update({
        metadata: {
          ...metadata,
          client_scope_map: next,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.id)
    if (error) throw new BadRequestException(error.message)
  }

  private async resolveParentContext(
    supabase: SupabaseClient,
    userId: string,
    spaceId: string,
    item: Record<string, unknown>,
    orgId?: string | null,
    orgRole?: import('@vibey/api-shared').OrgRole | null,
  ) {
    const customData =
      item.custom_data && typeof item.custom_data === 'object'
        ? (item.custom_data as Record<string, unknown>)
        : {}
    const external =
      customData.external_automation && typeof customData.external_automation === 'object'
        ? (customData.external_automation as Record<string, unknown>)
        : {}

    let parentMeetingTitle: string | null = null
    const parentId =
      typeof item.parent_item_id === 'string' ? item.parent_item_id : null
    if (parentId) {
      try {
        const parent = (await this.spaces.getItem(
          supabase,
          userId,
          spaceId,
          parentId,
          orgId,
          orgRole,
        )) as Record<string, unknown>
        parentMeetingTitle = String(parent.title ?? '').trim() || null
      } catch {
        parentMeetingTitle = null
      }
    }

    return {
      parent_meeting_title: parentMeetingTitle,
      parent_space_item_id: parentId,
      fathom_url:
        typeof customData.fathom_url === 'string'
          ? customData.fathom_url
          : typeof external.fathom_url === 'string'
            ? external.fathom_url
            : null,
      recording_url:
        typeof customData.recording_url === 'string' ? customData.recording_url : null,
      call_kind: typeof customData.entry_type === 'string' ? customData.entry_type : null,
    }
  }

  private async resolveAssigneeEmails(item: Record<string, unknown>) {
    const assignees = Array.isArray(item.assignees) ? item.assignees : []
    const out: Array<{ email?: string; name?: string; roas_user_id?: string }> = []

    for (const raw of assignees) {
      if (!raw || typeof raw !== 'object') continue
      const a = raw as { type?: string; id?: string }
      if (a.type !== 'human' || !a.id) continue
      try {
        const { data } = await this.svc.client.auth.admin.getUserById(a.id)
        const email = data.user?.email?.trim()
        const name =
          typeof data.user?.user_metadata?.full_name === 'string'
            ? data.user.user_metadata.full_name
            : typeof data.user?.user_metadata?.name === 'string'
              ? data.user.user_metadata.name
              : undefined
        out.push({
          roas_user_id: a.id,
          ...(email ? { email } : {}),
          ...(name ? { name } : {}),
        })
      } catch {
        out.push({ roas_user_id: a.id })
      }
    }
    return out
  }
}

const FALLBACK_PAGE_GRADER_TASK_TYPES: Array<{ id: string; label: string; hint: string }> = [
  { id: 'design', label: 'Graphics', hint: 'Design / graphic design requests' },
  { id: 'copy', label: 'Copywriting', hint: 'Copy and messaging requests' },
  { id: 'funnel', label: 'Funnels & Pages', hint: 'Funnel builds and landing pages' },
  { id: 'ad', label: 'Ads & Media Buying', hint: 'Ad creative and media buying' },
  { id: 'video', label: 'Video Editing', hint: 'Video editing requests' },
  { id: 'ghl', label: 'CRM / LeadConnector', hint: 'GHL / LeadConnector projects' },
  { id: 'other', label: 'Special / Other', hint: 'Anything that doesn’t fit the other types' },
]

function parseClientScopeMap(raw: unknown): Record<string, PageGraderClientScopeEntry> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: Record<string, PageGraderClientScopeEntry> = {}
  for (const [clientId, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!clientId || !value || typeof value !== 'object' || Array.isArray(value)) continue
    const row = value as Record<string, unknown>
    const campaignId = typeof row.campaign_id === 'string' ? row.campaign_id.trim() : ''
    if (!campaignId) continue
    const campaignName =
      typeof row.campaign_name === 'string' && row.campaign_name.trim()
        ? row.campaign_name.trim()
        : undefined
    const spaceId =
      typeof row.space_id === 'string' && row.space_id.trim()
        ? row.space_id.trim()
        : row.space_id === null
          ? null
          : undefined
    const spaceTitle =
      typeof row.space_title === 'string' && row.space_title.trim()
        ? row.space_title.trim()
        : undefined
    out[clientId] = {
      campaign_id: campaignId,
      ...(campaignName ? { campaign_name: campaignName } : {}),
      ...(spaceId !== undefined ? { space_id: spaceId } : {}),
      ...(spaceTitle ? { space_title: spaceTitle } : {}),
    }
  }
  return out
}

function safeHost(baseUrl: string): string | null {
  try {
    return new URL(baseUrl).host
  } catch {
    return null
  }
}

function mapRoasPriority(raw: unknown): string {
  const value = String(raw ?? '').trim().toLowerCase()
  if (value === 'urgent' || value === 'high' || value === 'low' || value === 'normal') return value
  if (value === 'medium') return 'normal'
  return 'normal'
}

function buildDescription(
  item: Record<string, unknown>,
  parentContext: Record<string, unknown>,
  note?: string,
): string {
  const parts: string[] = []
  const notes = typeof item.notes === 'string' ? item.notes.trim() : ''
  const description = typeof item.description === 'string' ? item.description.trim() : ''
  if (description) parts.push(description)
  if (notes && notes !== description) parts.push(notes)
  if (note?.trim()) parts.push(`Operator note: ${note.trim()}`)
  if (parentContext.parent_meeting_title) {
    parts.push(`From meeting: ${String(parentContext.parent_meeting_title)}`)
  }
  return parts.join('\n\n')
}

/** Appends operator note to Space notes once; returns null when nothing to write. */
function mergeOperatorNoteIntoNotes(existingNotes: string, operatorNote: string): string | null {
  if (!operatorNote) return null
  const marker = `Operator note: ${operatorNote}`
  if (existingNotes.includes(marker)) return existingNotes
  if (!existingNotes) return marker
  return `${existingNotes}\n\n${marker}`
}
