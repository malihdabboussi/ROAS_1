import {
  BadRequestException,
  ConflictException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PageGraderApiService } from '../../integrations/page-grader/services/page-grader-api.service'
import { SlackAgentToolsService } from '../../slack/services/slack-agent-tools.service'
import type {
  CreateWorkRequestDraftWebhookDto,
  RefreshWorkRequestDraftWebhookDto,
  UpdateWorkRequestDraftDto,
} from '../dto/work-request.dto'
import {
  WorkRequestRepository,
  type WorkRequestDraftRow,
} from '../repositories/work-request.repository'
import { appendAssetsToDescription } from './work-request-assets'
import {
  assignWorkRequestFinalTask,
  bindWorkRequestAssignee,
  stampWorkRequestAssignee,
} from './work-request-assignee'
import {
  ensureDraftResumeConversation,
  loadOwnedConversationId,
  mergeConversationIntoProvenance,
  mergeIncomingDraftConversation,
} from './work-request-conversation-stamp'
import { mirrorWorkRequestFinalTask } from './work-request-mirror'
import {
  slackReminderSendParams,
  WORK_REQUEST_EXPIRY_WARNING_MS,
  WORK_REQUEST_REMINDER_3H_MS,
  workRequestReminderText,
} from './work-request-reminders'
import {
  asRecord,
  buildWorkRequestWebhookResult,
  computeWorkRequestMissingFields,
  generateWorkRequestReviewToken,
  hashWorkRequestReviewToken,
  publicWorkRequestOptions,
  readResumeConversationId,
  safeWorkRequestError,
  sanitizeWorkRequestDraft,
  schemaData,
  stringValue,
} from './work-request-review-security'
import { WorkRequestScopeService } from './work-request-scope.service'

@Injectable()
export class WorkRequestService {
  constructor(
    private readonly repository: WorkRequestRepository,
    private readonly scope: WorkRequestScopeService,
    private readonly pageGraderApi: PageGraderApiService,
    private readonly slack: SlackAgentToolsService,
    private readonly config: ConfigService,
  ) {}
  async getReview(token: string) {
    let draft = await this.repository.findByTokenHash(hashWorkRequestReviewToken(token))
    if (!draft) return { state: 'invalid' as const }
    const state = await this.resolveState(draft)
    if (state !== 'draft') {
      const publicDraft = sanitizeWorkRequestDraft(draft)
      return {
        state,
        expires_at: draft.review_token_expires_at,
        final_task_id: draft.final_space_item_id,
        sync_status: draft.sync_status,
        task_url: publicDraft.task_url,
        clickup_url: publicDraft.clickup_url,
      }
    }
    draft = await ensureDraftResumeConversation({
      client: this.repository.client,
      draft,
      update: (id, values) => this.repository.update(id, values),
    })
    const options = await this.scope.loadScopedOptions(draft)
    return {
      state: 'draft' as const,
      draft: sanitizeWorkRequestDraft(draft),
      options: publicWorkRequestOptions(options),
    }
  }

  /**
   * Internal: stamp ROAS conversation onto a draft when Page Grader omitted it.
   * Never overwrites a different conversation already stored on the draft.
   */
  async stampConversation(draftId: string, conversationId: string) {
    const draft = await this.repository.findById(draftId)
    if (!draft) throw new NotFoundException('Service Request draft not found')
    const existing = readResumeConversationId(draft.provenance)
    if (existing === conversationId) {
      return { stamped: true as const, draft_id: draft.id, conversation_id: conversationId }
    }
    if (existing) {
      return {
        stamped: false as const,
        draft_id: draft.id,
        conversation_id: existing,
        reason: 'already_set' as const,
      }
    }
    const owned = await loadOwnedConversationId({
      client: this.repository.client,
      conversationId,
      ownerUserId: draft.owner_user_id,
      ownerOrgId: draft.owner_org_id,
    })
    if (!owned) throw new BadRequestException('Conversation is not available for this draft')
    const updated = await this.repository.update(draft.id, {
      provenance: mergeConversationIntoProvenance(asRecord(draft.provenance), owned),
    })
    return {
      stamped: true as const,
      draft_id: updated.id,
      conversation_id: owned,
    }
  }
  async updateReview(token: string, input: UpdateWorkRequestDraftDto) {
    const tokenHash = hashWorkRequestReviewToken(token)
    const draft = await this.requireActiveDraft(tokenHash)
    const options = await this.scope.loadScopedOptions(draft)
    const values: Record<string, unknown> = {}

    const selectedClientId = input.client_workspace_id ?? draft.campaign_id
    const selectedClient = options.clients.find((option) => option.id === selectedClientId)
    if (!selectedClient) throw new BadRequestException('That client workspace is not available')

    if (input.client_workspace_id !== undefined) {
      values.campaign_id = selectedClient.id
      values.page_grader_external_client_id = selectedClient.externalClientId
      values.routing = {
        ...asRecord(draft.routing),
        general_space_id: selectedClient.generalSpaceId,
      }
      if (selectedClient.id !== draft.campaign_id && input.campaign_space_id === undefined) {
        values.campaign_space_id = null
        values.page_grader_external_campaign_id = null
        values.routing = { ...asRecord(values.routing), work_scope: 'general' }
      }
    }

    if (input.campaign_space_id !== undefined) {
      if (input.campaign_space_id === null) {
        values.campaign_space_id = null
        values.page_grader_external_campaign_id = null
        values.routing = {
          ...asRecord(values.routing ?? draft.routing),
          work_scope: 'general',
          general_space_id: selectedClient.generalSpaceId,
        }
      } else {
        const selectedSpace = options.spaces.find(
          (option) =>
            option.id === input.campaign_space_id && option.clientWorkspaceId === selectedClient.id,
        )
        if (!selectedSpace) throw new BadRequestException('That campaign Space is not available')
        values.campaign_space_id = selectedSpace.id
        values.page_grader_external_campaign_id = selectedSpace.externalCampaignId
        values.routing = {
          ...asRecord(values.routing ?? draft.routing),
          work_scope: 'campaign',
          general_space_id: selectedClient.generalSpaceId,
        }
      }
    }

    for (const key of ['request_type', 'title', 'description', 'priority'] as const) {
      if (input[key] !== undefined) values[key] = input[key]
    }
    if (
      input.assignee_name !== undefined ||
      input.assignee_id !== undefined ||
      input.assignee_email !== undefined
    ) {
      const identity = bindWorkRequestAssignee(input, options.teamMembers ?? [])
      values.assignee_name = identity.name
      values.routing = stampWorkRequestAssignee(asRecord(values.routing ?? draft.routing), identity)
    }
    if (input.due_date !== undefined) {
      values.due_at = input.due_date ? `${input.due_date}T23:59:59.000Z` : null
    }
    if (input.assets !== undefined) values.assets = input.assets
    if (input.dependencies !== undefined) values.dependencies = input.dependencies
    if (input.structured_fields !== undefined || input.links !== undefined) {
      values.structured_fields = {
        ...asRecord(draft.structured_fields),
        ...(input.structured_fields ?? {}),
        ...(input.links !== undefined ? { links: input.links } : {}),
      }
    }

    if (input.assets !== undefined || input.description !== undefined) {
      // Description is the field that reaches the ClickUp body: keep assets in it.
      const nextDescription =
        (values.description as string | null | undefined) ?? draft.description ?? null
      const nextAssets = (values.assets ?? draft.assets) as Array<{
        name: string
        url: string
        kind?: string
      }>
      values.description = appendAssetsToDescription(nextDescription, nextAssets)
    }

    const candidate = { ...draft, ...values } as WorkRequestDraftRow
    values.missing_fields = computeWorkRequestMissingFields(candidate)
    const updated = await this.repository.update(draft.id, values)
    return {
      state: 'draft' as const,
      draft: sanitizeWorkRequestDraft(updated),
      options: publicWorkRequestOptions(await this.scope.loadScopedOptions(updated)),
    }
  }
  async finalizeReview(token: string) {
    const tokenHash = hashWorkRequestReviewToken(token)
    const draft = await this.repository.findByTokenHash(tokenHash)
    if (!draft) throw new NotFoundException('Service Request link not found')
    const state = await this.resolveState(draft)
    if (state === 'expired') throw new GoneException('Service Request link expired')
    if (state === 'revoked') throw new GoneException('Service Request link revoked')
    if (state === 'finalized') {
      let current = draft
      if (draft.final_space_item_id) {
        const existingTask = await this.repository.findTask(draft.final_space_item_id)
        if (existingTask) {
          const task = await this.assignFinalTaskWhenMapped(draft, existingTask)
          if (draft.sync_status !== 'synced') current = await this.mirrorFinalTask(draft, task)
        }
      }
      const publicDraft = sanitizeWorkRequestDraft(current)
      return {
        state: 'finalized' as const,
        draft: publicDraft,
        final_task_id: current.final_space_item_id,
        sync_status: current.sync_status,
        task_url: publicDraft.task_url,
        clickup_url: publicDraft.clickup_url,
      }
    }
    if (draft.missing_fields.length > 0) {
      throw new BadRequestException('Complete the missing request context before submitting')
    }
    await this.validateTargetSpace(draft)
    const finalized = await this.repository.finalize(tokenHash)
    finalized.task = await this.assignFinalTaskWhenMapped(finalized.draft, finalized.task)
    if (finalized.draft.sync_status === 'synced') {
      const publicDraft = sanitizeWorkRequestDraft(finalized.draft)
      return {
        state: 'finalized' as const,
        draft: publicDraft,
        final_task_id: finalized.draft.final_space_item_id,
        sync_status: finalized.draft.sync_status,
        task_url: publicDraft.task_url,
        clickup_url: publicDraft.clickup_url,
      }
    }

    const mirrored = await this.mirrorFinalTask(finalized.draft, finalized.task)
    const publicDraft = sanitizeWorkRequestDraft(mirrored)
    return {
      state: 'finalized' as const,
      draft: publicDraft,
      final_task_id: mirrored.final_space_item_id,
      sync_status: mirrored.sync_status,
      task_url: publicDraft.task_url,
      clickup_url: publicDraft.clickup_url,
    }
  }

  async requestPublicRefresh(token: string) {
    const draft = await this.repository.findByTokenHash(hashWorkRequestReviewToken(token))
    if (!draft) return { state: 'invalid' as const }
    if (draft.status === 'finalized') {
      return { state: 'finalized' as const, final_task_id: draft.final_space_item_id }
    }
    return {
      state: 'refresh_required' as const,
      message: 'Ask for a fresh Service Request review link in the original conversation.',
    }
  }

  async createFromPageGrader(signature: string, input: CreateWorkRequestDraftWebhookDto) {
    const { mapping, ownerOrgId, generalSpace, campaignSpace } =
      await this.scope.resolveIntakeScope(
        signature,
        input.client_id,
        input.client_name,
        input.campaign_id,
      )
    const token = generateWorkRequestReviewToken()
    const issuedAt = new Date()
    const expiresAt = new Date(issuedAt.getTime() + 24 * 60 * 60 * 1000)
    const baseValues = {
      owner_user_id: mapping.userId,
      owner_org_id: ownerOrgId,
      campaign_id: mapping.entry.campaign_id,
      campaign_space_id:
        input.work_scope === 'campaign' && campaignSpace ? String(campaignSpace.id) : null,
      page_grader_external_client_id: input.client_id,
      page_grader_external_campaign_id:
        input.work_scope === 'campaign' ? (input.campaign_id ?? null) : null,
      request_type: input.request_type,
      assignee_name: input.assignee_name,
      title: input.title,
      description: appendAssetsToDescription(input.description, input.assets, {
        sourceUrl: input.provenance?.source_url ?? null,
      }),
      due_at: input.due_date ? `${input.due_date}T23:59:59.000Z` : null,
      priority: input.priority,
      structured_fields: input.structured_fields,
      required_fields: input.required_fields,
      assets: input.assets,
      dependencies: input.dependencies,
      provenance: input.provenance,
      requester_metadata: input.requester,
      routing: {
        work_scope: input.work_scope,
        general_space_id: generalSpace ? String(generalSpace.id) : null,
        connection_org_id: mapping.orgId,
        origin_page_grader_client_id: input.client_id,
        page_grader_client_name: input.client_name,
      },
      idempotency_key: input.idempotency_key,
      review_token_hash: hashWorkRequestReviewToken(token),
      review_token_issued_at: issuedAt.toISOString(),
      review_token_expires_at: expiresAt.toISOString(),
    }
    const candidate = {
      ...baseValues,
      missing_fields: [],
    } as unknown as WorkRequestDraftRow
    const missing = computeWorkRequestMissingFields(candidate)

    let draft = await this.repository.findByIdempotency(
      mapping.userId,
      input.client_id,
      input.idempotency_key,
    )
    if (draft) {
      draft = await mergeIncomingDraftConversation({
        client: this.repository.client,
        draft,
        provenance: input.provenance,
        update: (id, values) => this.repository.update(id, values),
      })
      const replayToken = generateWorkRequestReviewToken()
      const replayIssuedAt = new Date()
      draft = await this.reissueToken(
        draft,
        replayToken,
        replayIssuedAt,
        new Date(replayIssuedAt.getTime() + 24 * 60 * 60 * 1000),
        `intake-replay:${input.idempotency_key}`,
        draft.status === 'finalized',
      )
      return this.webhookResult(
        draft,
        replayToken,
        draft.status === 'finalized' ? 'finalized' : 'existing',
      )
    }
    try {
      draft = await this.repository.create({ ...baseValues, missing_fields: [...new Set(missing)] })
    } catch (error) {
      if ((error as { code?: string }).code !== '23505') throw error
      draft = await this.repository.findByIdempotency(
        mapping.userId,
        input.client_id,
        input.idempotency_key,
      )
      if (!draft) throw error
      draft = await mergeIncomingDraftConversation({
        client: this.repository.client,
        draft,
        provenance: input.provenance,
        update: (id, values) => this.repository.update(id, values),
      })
      return this.webhookResult(draft, null, 'existing')
    }
    return this.webhookResult(draft, token, 'created')
  }

  async refreshFromPageGrader(signature: string, input: RefreshWorkRequestDraftWebhookDto) {
    const mapping = await this.scope.resolveSignedMapping(signature, input.client_id)
    const draft = await this.repository.findById(input.draft_id)
    const routing = asRecord(draft?.routing)
    if (
      !draft ||
      draft.owner_user_id !== mapping.userId ||
      (stringValue(routing.connection_org_id) || null) !== mapping.orgId ||
      stringValue(routing.origin_page_grader_client_id) !== input.client_id
    ) {
      throw new NotFoundException('Service Request draft not found')
    }
    const token = generateWorkRequestReviewToken()
    const issuedAt = new Date()
    const expiresAt = new Date(issuedAt.getTime() + 24 * 60 * 60 * 1000)
    const refreshed = await this.reissueToken(
      draft,
      token,
      issuedAt,
      expiresAt,
      input.idempotency_key,
      draft.status === 'finalized',
    )
    return this.webhookResult(
      refreshed,
      token,
      draft.token_refresh_idempotency_key === input.idempotency_key
        ? 'already_refreshed'
        : draft.status === 'finalized'
          ? 'finalized'
          : 'refreshed',
    )
  }

  async processDueReminders(limit = 50) {
    const now = new Date()
    const [threeHour, expiryWarning] = await Promise.all([
      this.repository.listDueThreeHourReminders(
        new Date(now.getTime() - WORK_REQUEST_REMINDER_3H_MS).toISOString(),
        limit,
      ),
      this.repository.listDueExpiryWarnings(
        new Date(now.getTime() + WORK_REQUEST_EXPIRY_WARNING_MS).toISOString(),
        limit,
      ),
    ])
    let sent = 0
    for (const draft of threeHour) {
      sent += await this.deliverReminder(draft, 'reminder_3h_sent_at')
    }
    for (const draft of expiryWarning) {
      sent += await this.deliverReminder(draft, 'reminder_1h_sent_at')
    }
    return { processed: threeHour.length + expiryWarning.length, sent }
  }

  async processDueWork(limit = 50) {
    const [reminders, retries] = await Promise.all([
      this.processDueReminders(limit),
      this.processDueSyncRetries(limit),
    ])
    return { reminders, retries }
  }

  private async processDueSyncRetries(limit: number) {
    const drafts = await this.repository.listDueSyncRetries(new Date().toISOString(), limit)
    let synced = 0
    for (const draft of drafts) {
      if (!draft.final_space_item_id) continue
      const task = await this.repository.findTask(draft.final_space_item_id)
      if (!task) {
        await this.repository.update(draft.id, {
          sync_status: 'sync_failed',
          next_retry_at: null,
          last_error: 'Canonical ROAS task no longer exists',
        })
        continue
      }
      const updated = await this.mirrorFinalTask(draft, task)
      if (updated.sync_status === 'synced') synced += 1
    }
    return { processed: drafts.length, synced }
  }

  private async mirrorFinalTask(
    draft: WorkRequestDraftRow,
    task: Record<string, unknown>,
  ): Promise<WorkRequestDraftRow> {
    const assigned = await this.assignFinalTaskWhenMapped(draft, task)
    return mirrorWorkRequestFinalTask(this.repository, this.pageGraderApi, draft, assigned)
  }

  private async assignFinalTaskWhenMapped(
    draft: WorkRequestDraftRow,
    task: Record<string, unknown>,
  ) {
    if (!draft.assignee_name && !asRecord(draft.routing).assignee) return task
    const options = await this.scope.loadScopedOptions(draft)
    return assignWorkRequestFinalTask({
      draft,
      task,
      teamMembers: options.teamMembers ?? [],
      resolveOrgAssigneeByName: (orgId, name, email) =>
        this.repository.resolveOrgAssigneeByName(orgId, name, email),
      assignTask: (taskId, userId) => this.repository.assignTask(taskId, userId),
      updateDraft: (id, values) => this.repository.update(id, values),
    })
  }

  private async requireActiveDraft(tokenHash: string): Promise<WorkRequestDraftRow> {
    const draft = await this.repository.findByTokenHash(tokenHash)
    if (!draft) throw new NotFoundException('Service Request link not found')
    const state = await this.resolveState(draft)
    if (state === 'expired') throw new GoneException('Service Request link expired')
    if (state === 'revoked') throw new GoneException('Service Request link revoked')
    if (state === 'finalized') throw new ConflictException('Service Request already submitted')
    return draft
  }

  private async resolveState(draft: WorkRequestDraftRow) {
    if (draft.status === 'finalized') return 'finalized' as const
    if (draft.status === 'revoked' || draft.review_token_revoked_at) return 'revoked' as const
    if (draft.status === 'expired' || Date.parse(draft.review_token_expires_at) <= Date.now()) {
      if (draft.status === 'draft') await this.repository.update(draft.id, { status: 'expired' })
      return 'expired' as const
    }
    return 'draft' as const
  }

  private async validateTargetSpace(draft: WorkRequestDraftRow) {
    const routing = asRecord(draft.routing)
    const campaignWork = routing.work_scope === 'campaign'
    const spaceId = campaignWork ? draft.campaign_space_id : stringValue(routing.general_space_id)
    if (!spaceId) throw new BadRequestException('Choose a valid destination Space')
    const space = await this.repository.findSpace(spaceId)
    const schema = schemaData(space)
    const scoped =
      space &&
      String(space.campaign_id) === draft.campaign_id &&
      this.scope.isScopedRow(space, draft.owner_user_id, draft.owner_org_id)
    const validRole = campaignWork
      ? schema.space_role === 'client_campaign' &&
        schema.page_grader_campaign_id === draft.page_grader_external_campaign_id
      : schema.space_role === 'general' &&
        schema.page_grader_client_id === draft.page_grader_external_client_id
    if (!scoped || !validRole) throw new BadRequestException('Destination Space is not available')
  }

  private async reissueToken(
    draft: WorkRequestDraftRow,
    token: string,
    issuedAt: Date,
    expiresAt: Date,
    refreshKey: string | null,
    preserveFinalized = false,
  ) {
    return this.repository.update(draft.id, {
      status: preserveFinalized ? draft.status : 'draft',
      review_token_hash: hashWorkRequestReviewToken(token),
      review_token_issued_at: issuedAt.toISOString(),
      review_token_expires_at: expiresAt.toISOString(),
      review_token_revoked_at: null,
      review_token_reissued_at: issuedAt.toISOString(),
      review_token_version: draft.review_token_version + 1,
      token_refresh_idempotency_key: refreshKey,
      reminder_3h_sent_at: null,
      reminder_1h_sent_at: null,
    })
  }

  private webhookResult(draft: WorkRequestDraftRow, token: string | null, state: string) {
    return buildWorkRequestWebhookResult(
      draft,
      token,
      this.config.get<string>('APP_URL') || 'https://app.roas.io',
      state,
    )
  }

  private async deliverReminder(
    draft: WorkRequestDraftRow,
    column: 'reminder_3h_sent_at' | 'reminder_1h_sent_at',
  ): Promise<number> {
    const claimedAt = new Date().toISOString()
    if (!(await this.repository.claimReminder(draft.id, column, claimedAt))) return 0
    const target = slackReminderSendParams(draft.provenance)
    if (!target) return 0
    try {
      await this.slack.sendMessage(
        this.repository.client,
        draft.owner_user_id,
        draft.owner_org_id,
        {
          ...target,
          text: workRequestReminderText(column, draft.title),
          unfurl_links: false,
          unfurl_media: false,
        },
      )
      return 1
    } catch (error) {
      await this.repository.update(draft.id, {
        [column]: null,
        last_error: safeWorkRequestError(error),
      })
      return 0
    }
  }
}
