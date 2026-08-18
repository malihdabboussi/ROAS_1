import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SupabaseServiceClient } from '@vibey/api-shared'
import { SpacesService } from '../../../spaces/services/spaces.service'
import { VaultService } from '../../../vault/services/vault.service'
import type { SendPageGraderWorkDto } from '../dto/page-grader.dto'
import { PageGraderIntegration } from '../integrations/page-grader.integration'
import {
  buildDescription,
  getPageGraderCreds,
  mapRoasPriority,
  mergeOperatorNoteIntoNotes,
  PAGE_GRADER_PROVIDER,
  resolvePageGraderCampaignId,
  type PageGraderSendResult,
} from './page-grader-api.helpers'

@Injectable()
export class PageGraderSendWorkService {
  private readonly logger = new Logger(PageGraderSendWorkService.name)

  constructor(
    private readonly pageGrader: PageGraderIntegration,
    private readonly vault: VaultService,
    private readonly spaces: SpacesService,
    private readonly svc: SupabaseServiceClient,
    private readonly config: ConfigService,
  ) {}

  async sendWork(
    supabase: SupabaseClient,
    userId: string,
    dto: SendPageGraderWorkDto,
    orgId?: string | null,
    orgRole?: import('@vibey/api-shared').OrgRole | null,
  ): Promise<{ success: boolean; results: PageGraderSendResult[] }> {
    const creds = await getPageGraderCreds(this.vault, userId)
    const appUrl = (this.config.get<string>('APP_URL') || 'https://app.roas.io').replace(/\/+$/, '')
    const workKind = dto.work_kind ?? 'task_request'
    const taskType = dto.task_type
    const results: PageGraderSendResult[] = []
    const space = await this.loadSpace(supabase, userId, dto.space_id, orgId, orgRole)

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
        const campaignId = resolvePageGraderCampaignId({
          dtoCampaignId: dto.campaign_id,
          item,
          space,
        })
        const source = {
          system: 'roas',
          origin: dto.origin ?? 'roas',
          org_id: orgId ?? null,
          space_id: dto.space_id,
          space_item_id: itemId,
          space_url: `${appUrl}/spaces/${dto.space_id}?item=${itemId}`,
        }

        // Already linked: still call Page Grader create (idempotent) so ClickUp push can retry.
        if (typeof existingPg?.work_id === 'string' && existingPg.work_id.trim()) {
          try {
            const { work } = await this.pageGrader.createWork(creds.baseUrl, creds.apiKey, {
              client_id: dto.client_id,
              ...(campaignId ? { campaign_id: campaignId } : {}),
              source,
              work: {
                kind: workKind,
                task_type: taskType,
                task_subtype: dto.task_subtype,
                title: String(item.title ?? '').trim() || 'Untitled task',
                description: '',
                source_excerpt: dto.source_excerpt,
                open_questions: dto.open_questions,
                priority: mapRoasPriority(item.priority),
                due_at:
                  typeof dto.due_date === 'string' && dto.due_date.trim()
                    ? dto.due_date.trim().slice(0, 10)
                    : typeof item.due_date === 'string'
                      ? item.due_date
                      : null,
              },
            })
            if (
              (work.url && work.url !== existingPg.work_url) ||
              work.clickup_task_id !== existingPg.clickup_task_id ||
              work.clickup_task_url !== existingPg.clickup_task_url
            ) {
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
                      clickup_task_id: work.clickup_task_id ?? null,
                      clickup_task_url: work.clickup_task_url ?? null,
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
              clickup_task_id: work.clickup_task_id,
              clickup_task_url: work.clickup_task_url,
              assignee_resolution: work.assignee_resolution,
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
        // Operator note stays on the top-level `note` field only. Embedding it
        // in `work.description` made Portal render "Operator note:" twice.
        const description = buildDescription(item, parentContext)
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
          ...(campaignId ? { campaign_id: campaignId } : {}),
          note: operatorNote || undefined,
          source,
          work: {
            kind: workKind,
            task_type: taskType,
            task_subtype: dto.task_subtype,
            title,
            description,
            source_excerpt: dto.source_excerpt,
            open_questions: dto.open_questions,
            priority: mapRoasPriority(item.priority),
            due_at: dueAt,
            tags: nextTags,
            // Omit empty assignees so Portal From Pagegrader rules can assign.
            ...(assignees.length > 0 ? { assignees } : {}),
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
              task_subtype: dto.task_subtype ?? null,
              work_url: work.url,
              clickup_task_id: work.clickup_task_id ?? null,
              clickup_task_url: work.clickup_task_url ?? null,
              sent_at: new Date().toISOString(),
              sent_by_user_id: userId,
              client_tag_id: dto.client_tag_id ?? null,
            },
          },
        }
        if (
          dueAt &&
          dueAt !==
            String(item.due_date ?? '')
              .trim()
              .slice(0, 10)
        ) {
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
          clickup_task_id: work.clickup_task_id,
          clickup_task_url: work.clickup_task_url,
          assignee_resolution: work.assignee_resolution,
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
      .eq('integration_id', PAGE_GRADER_PROVIDER)
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

  private async loadSpace(
    supabase: SupabaseClient,
    userId: string,
    spaceId: string,
    orgId?: string | null,
    orgRole?: import('@vibey/api-shared').OrgRole | null,
  ): Promise<Record<string, unknown> | null> {
    try {
      return (await this.spaces.getById(supabase, userId, spaceId, orgId, orgRole)) as Record<
        string,
        unknown
      >
    } catch {
      return null
    }
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
    const parentId = typeof item.parent_item_id === 'string' ? item.parent_item_id : null
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
      recording_url: typeof customData.recording_url === 'string' ? customData.recording_url : null,
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
