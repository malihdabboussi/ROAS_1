import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import { ModuleRef } from '@nestjs/core'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  PageGraderMeetingAgendaResult,
  PageGraderMeetingAgendaWrite,
} from '../../integrations/page-grader/integrations/page-grader.integration.types'
import {
  buildGoogleDocTabLink,
  buildPrecallPrompt,
  matchUniqueClientByEventTitle,
  parsePrepDocToAgendaSections,
  validateMeetingReadyAgendaSections,
  type PrecallAgendaEventLike,
} from './meetings-precall-agenda-sections'
import { buildCampaignNotesFromPrepContext } from './meetings-precall-campaign-notes'

type PageGraderApiLike = {
  listClients: (
    userId: string,
    opts: { all?: boolean },
  ) => Promise<{ clients: Array<{ id: string; name: string }> }>
  getMeetingPrepContext: (
    userId: string,
    clientId: string,
    meetingDate?: string | null,
  ) => Promise<Record<string, unknown>>
  writeMeetingAgenda: (
    userId: string,
    clientId: string,
    payload: PageGraderMeetingAgendaWrite,
  ) => Promise<PageGraderMeetingAgendaResult>
}

@Injectable()
export class MeetingsPrecallDriveAgendaService {
  private readonly logger = new Logger(MeetingsPrecallDriveAgendaService.name)

  constructor(private readonly moduleRef: ModuleRef) {}

  resolvePageGraderApi(): PageGraderApiLike {
    try {
      const { PageGraderApiService } =
        require('../../integrations/page-grader/services/page-grader-api.service') as {
          PageGraderApiService: new (...args: unknown[]) => PageGraderApiLike
        }
      return this.moduleRef.get(PageGraderApiService, { strict: false })
    } catch {
      throw new BadRequestException('Page Grader service unavailable for meeting agenda write')
    }
  }

  async resolvePageGraderClientId(
    userId: string,
    event: PrecallAgendaEventLike,
  ): Promise<string | null> {
    try {
      const pageGrader = this.resolvePageGraderApi()
      const catalog = await pageGrader.listClients(userId, { all: true })
      const match = matchUniqueClientByEventTitle(event.title, catalog.clients ?? [])
      return match?.id ?? null
    } catch (err) {
      this.logger.warn(
        `Page Grader client resolve failed: ${err instanceof Error ? err.message : String(err)}`,
      )
      return null
    }
  }

  async writeDriveAgendaAfterPrep(input: {
    supabase: SupabaseClient
    userId: string
    spaceId: string
    itemId: string
    event: PrecallAgendaEventLike
    pageGraderClientId?: string | null
  }): Promise<void> {
    const ready = await this.waitForPrepReady(input.supabase, input.itemId, 40, 15_000)
    if (!ready) {
      this.logger.warn(`Prep ${input.itemId} did not become ready; skipping Drive agenda write`)
      return
    }

    const { data: item } = await input.supabase
      .from('space_items')
      .select('id, custom_data, updated_at')
      .eq('id', input.itemId)
      .maybeSingle()
    const custom = (item?.custom_data ?? {}) as Record<string, unknown>
    if (typeof custom.agenda_tab_id === 'string' && custom.agenda_tab_id.trim()) {
      this.logger.log(
        `Drive agenda already exists for prep ${input.itemId}; skipping duplicate write`,
      )
      return
    }
    const writeUpdatedMs = new Date(String(item?.updated_at ?? '')).getTime()
    if (
      custom.agenda_write_status === 'writing' &&
      Number.isFinite(writeUpdatedMs) &&
      Date.now() - writeUpdatedMs < 10 * 60 * 1000
    ) {
      this.logger.log(`Drive agenda write already in progress for prep ${input.itemId}`)
      return
    }
    await input.supabase
      .from('space_items')
      .update({
        custom_data: {
          ...custom,
          agenda_write_status: 'writing',
          agenda_write_error: null,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.itemId)
    const clientId =
      (typeof custom.page_grader_client_id === 'string' ? custom.page_grader_client_id : null) ||
      input.pageGraderClientId ||
      (await this.resolvePageGraderClientId(input.userId, input.event))
    if (!clientId) {
      this.logger.log(`No Page Grader client mapped for prep ${input.itemId}; Space prep only`)
      return
    }

    const docBody = await this.loadChildPrepDocumentBody(
      input.supabase,
      input.spaceId,
      input.itemId,
    )
    const sections = parsePrepDocToAgendaSections(docBody || '')
    let contentProblems = validateMeetingReadyAgendaSections(sections)
    if (contentProblems.some((problem) => problem.startsWith('Campaign notes')) && clientId) {
      try {
        const context = await this.resolvePageGraderApi().getMeetingPrepContext(
          input.userId,
          clientId,
          input.event.start,
        )
        sections.campaign_notes = buildCampaignNotesFromPrepContext(context)
        contentProblems = validateMeetingReadyAgendaSections(sections)
      } catch (err) {
        this.logger.warn(
          `Campaign notes fallback failed for prep ${input.itemId}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        )
      }
    }
    if (contentProblems.length > 0) {
      throw new BadRequestException(
        `Precall prep is not meeting-ready: ${contentProblems.join('; ')}`,
      )
    }

    const pageGrader = this.resolvePageGraderApi()
    const result = await pageGrader.writeMeetingAgenda(input.userId, clientId, {
      meeting_date: input.event.start,
      sections: {
        agenda: sections.agenda,
        topics: sections.topics,
        actions: sections.actions,
        this_week: sections.this_week,
        next_week: sections.next_week,
        performance: sections.performance,
        wins: sections.wins,
        campaign_notes: sections.campaign_notes,
        needs_blockers: sections.needs_blockers,
      },
      insert_ad_previews: true,
      roas_prep_item_id: input.itemId,
      notes: input.event.operator_notes ?? null,
    })

    const docLink =
      result.tab_id && result.doc_link
        ? buildGoogleDocTabLink(result.doc_link, result.tab_id)
        : result.doc_link

    await input.supabase
      .from('space_items')
      .update({
        custom_data: {
          ...custom,
          page_grader_client_id: clientId,
          agenda_doc_id: result.doc_id,
          agenda_doc_link: docLink ?? result.doc_link,
          agenda_tab_id: result.tab_id,
          agenda_tab_name: result.tab_name,
          page_grader_meeting_agenda_id: result.meeting_agenda_id,
          agenda_write_status: 'ready',
          agenda_write_error: null,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.itemId)

    this.logger.log(
      `Drive agenda written for prep ${input.itemId}: doc=${result.doc_id} tab=${result.tab_id}`,
    )
  }

  private async waitForPrepReady(
    supabase: SupabaseClient,
    itemId: string,
    attempts: number,
    delayMs: number,
  ): Promise<boolean> {
    for (let i = 0; i < attempts; i++) {
      const { data } = await supabase
        .from('space_items')
        .select('custom_data, task_execution_status')
        .eq('id', itemId)
        .maybeSingle()
      const custom = (data?.custom_data ?? {}) as Record<string, unknown>
      const status = String(custom.prep_status ?? '')
      const exec = String(data?.task_execution_status ?? '').toLowerCase()
      if (status === 'ready') return true
      if (status === 'failed' || exec === 'failed' || exec === 'cancelled') return false
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
    return false
  }

  private async loadChildPrepDocumentBody(
    supabase: SupabaseClient,
    spaceId: string,
    parentItemId: string,
  ): Promise<string> {
    const { data } = await supabase
      .from('space_items')
      .select('id, title, notes, description, doc_body, custom_data')
      .eq('space_id', spaceId)
      .eq('parent_item_id', parentItemId)
      .order('created_at', { ascending: false })
      .limit(5)
    for (const row of data ?? []) {
      const custom = (row.custom_data ?? {}) as Record<string, unknown>
      const body =
        (typeof custom.body === 'string' && custom.body) ||
        (typeof custom.content === 'string' && custom.content) ||
        (typeof row.doc_body === 'string' && row.doc_body) ||
        (typeof row.notes === 'string' && row.notes) ||
        (typeof row.description === 'string' && row.description) ||
        ''
      if (body.trim()) return body
    }
    const { data: parent } = await supabase
      .from('space_items')
      .select('notes, description, doc_body')
      .eq('id', parentItemId)
      .maybeSingle()
    return String(parent?.doc_body ?? parent?.notes ?? parent?.description ?? '')
  }

  async invokePrepAgent(input: {
    supabase: SupabaseClient
    userId: string
    orgId: string | null
    spaceId: string
    itemId: string
    event: PrecallAgendaEventLike
    space?: Record<string, unknown> | null
    pageGraderClientId?: string | null
    pageGraderCampaignId?: string | null
    relatedContext: string
    internalToken: string
    userAgentApi: {
      invoke: (
        userId: string,
        path: string,
        init: RequestInit,
        opts?: { timeoutMs?: number; logTag?: string },
      ) => Promise<Response>
    }
  }): Promise<void> {
    const space = input.space
    let pageGraderContext = ''
    let pageGraderClientName: string | null = null
    const resolvedClientId =
      input.pageGraderClientId?.trim() ||
      (await this.resolvePageGraderClientId(input.userId, input.event))
    if (resolvedClientId) {
      try {
        const pageGrader = this.resolvePageGraderApi()
        const pack = await pageGrader.getMeetingPrepContext(
          input.userId,
          resolvedClientId,
          input.event.start,
        )
        const client = (pack.client as { name?: string } | undefined) ?? undefined
        pageGraderClientName = typeof client?.name === 'string' ? client.name : null
        pageGraderContext = JSON.stringify(pack, null, 2).slice(0, 30_000)
        const { data: existingItem } = await input.supabase
          .from('space_items')
          .select('custom_data')
          .eq('id', input.itemId)
          .maybeSingle()
        await input.supabase
          .from('space_items')
          .update({
            custom_data: {
              ...((existingItem?.custom_data as Record<string, unknown> | null) ?? {}),
              entry_type: 'prep',
              calendar_event_id: input.event.id,
              prep_status: 'pending',
              call_date: input.event.start,
              page_grader_client_id: resolvedClientId,
            },
          })
          .eq('id', input.itemId)
      } catch (err) {
        this.logger.warn(
          `Page Grader prep context unavailable for ${resolvedClientId}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        )
      }
    }

    const promptBase = buildPrecallPrompt({
      event: input.event,
      relatedContext: input.relatedContext,
      pageGraderContext,
      pageGraderClientName,
    })
    const prompt = [
      promptBase,
      '',
      'Create exactly one Document by calling save_document with this shape:',
      JSON.stringify(
        {
          title: `Prep — ${input.event.title}`.slice(0, 120),
          body: '<full prep markdown with the required ## headings>',
          space_id: input.spaceId,
          source_item_id: input.itemId,
          parent_item_id: input.itemId,
        },
        null,
        2,
      ),
      '',
      'After the document is saved, update_task on THIS prep item: set custom field prep_status to ready and status to logged (To action).',
    ].join('\n')

    if (!input.internalToken) throw new Error('INTERNAL_API_TOKEN not configured')

    await input.supabase
      .from('space_items')
      .update({ task_execution_status: 'running' })
      .eq('id', input.itemId)

    const response = await input.userAgentApi.invoke(
      input.userId,
      '/api/task-agent/invoke',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Internal-Token': input.internalToken },
        body: JSON.stringify({
          item_id: input.itemId,
          space_id: input.spaceId,
          agent_key: 'vibey',
          user_id: input.userId,
          org_id: input.orgId,
          campaign_id:
            input.pageGraderCampaignId?.trim() ||
            (space && typeof (space as { campaign_id?: unknown }).campaign_id === 'string'
              ? (space as { campaign_id: string }).campaign_id
              : null),
          prompt,
          agent_collaboration: 'disabled',
        }),
      },
      {
        timeoutMs: 600_000,
        logTag: `precall_prep item=${input.itemId}`,
      },
    )
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as Record<string, unknown> | null
      await input.supabase
        .from('space_items')
        .update({
          custom_data: {
            entry_type: 'prep',
            calendar_event_id: input.event.id,
            prep_status: 'failed',
            call_date: input.event.start,
            ...(resolvedClientId ? { page_grader_client_id: resolvedClientId } : {}),
          },
          task_execution_status: 'failed',
        })
        .eq('id', input.itemId)
      throw new Error(String(body?.error ?? body?.message ?? 'Task agent invocation failed'))
    }
  }
}
