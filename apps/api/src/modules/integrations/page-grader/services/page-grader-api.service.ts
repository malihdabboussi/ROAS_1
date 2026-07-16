import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ConfigService } from '@nestjs/config'
import { SupabaseServiceClient } from '@vibey/api-shared'
import { VaultService } from '../../../vault/services/vault.service'
import { SpacesService } from '../../../spaces/services/spaces.service'
import { IntegrationConnectionsRepository } from '../../repositories/integration-connections.repository'
import type { ListPageGraderClientsDto, SendPageGraderWorkDto } from '../dto/page-grader.dto'
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
    return { clients }
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

        if (typeof existingPg?.work_id === 'string' && existingPg.work_id.trim()) {
          results.push({
            space_item_id: itemId,
            status: 'skipped_already_sent',
            work_id: existingPg.work_id,
            work_url: typeof existingPg.work_url === 'string' ? existingPg.work_url : undefined,
          })
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
        const assignees = await this.resolveAssigneeEmails(item)

        const title = String(item.title ?? '').trim() || 'Untitled task'
        const description = buildDescription(item, parentContext, dto.note)

        const payload = {
          client_id: dto.client_id,
          note: dto.note?.trim() || undefined,
          source: {
            system: 'roas',
            org_id: orgId ?? null,
            space_id: dto.space_id,
            space_item_id: itemId,
            space_url: `${appUrl}/spaces/${dto.space_id}?item=${itemId}`,
          },
          work: {
            kind: 'task',
            title,
            description,
            priority: mapRoasPriority(item.priority),
            due_at: typeof item.due_date === 'string' ? item.due_date : null,
            tags: Array.isArray(item.tags) ? item.tags.map(String) : [],
            assignees,
            context: parentContext,
          },
        }

        const { work, status } = await this.pageGrader.createWork(
          creds.baseUrl,
          creds.apiKey,
          payload,
        )

        await this.spaces.updateItem(
          supabase,
          userId,
          dto.space_id,
          itemId,
          {
            custom_data: {
              page_grader: {
                client_id: dto.client_id,
                work_id: work.id,
                work_kind: work.kind,
                work_url: work.url,
                sent_at: new Date().toISOString(),
                sent_by_user_id: userId,
              },
            },
          },
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

    return { success: results.every((r) => r.status !== 'failed'), results }
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
