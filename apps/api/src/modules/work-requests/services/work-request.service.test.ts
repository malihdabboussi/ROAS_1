import { describe, expect, it, vi } from 'vitest'
import { UpdateWorkRequestDraftSchema } from '../dto/work-request.dto'
import type { WorkRequestDraftRow } from '../repositories/work-request.repository'
import {
  hashWorkRequestReviewToken,
  sanitizeWorkRequestDraft,
} from './work-request-review-security'
import { WorkRequestService } from './work-request.service'

const TOKEN = 'a'.repeat(43)

function draft(overrides: Partial<WorkRequestDraftRow> = {}): WorkRequestDraftRow {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    owner_user_id: '22222222-2222-2222-2222-222222222222',
    owner_org_id: '33333333-3333-3333-3333-333333333333',
    campaign_id: '44444444-4444-4444-4444-444444444444',
    campaign_space_id: null,
    page_grader_external_client_id: '55555555-5555-5555-5555-555555555555',
    page_grader_external_campaign_id: null,
    request_type: 'funnel',
    assignee_name: null,
    title: 'Build launch funnel',
    description: 'Use the approved offer.',
    due_at: null,
    priority: 'high',
    structured_fields: { objective: 'Leads', links: ['https://example.com/brief'] },
    required_fields: ['title', 'objective'],
    missing_fields: [],
    assets: [],
    dependencies: [],
    provenance: { channel_id: 'C123', thread_ts: '123.456', secret: 'not-public' },
    routing: {
      work_scope: 'general',
      general_space_id: '66666666-6666-6666-6666-666666666666',
    },
    requester_metadata: { name: 'Alex', email: 'alex@example.com' },
    status: 'draft',
    idempotency_key: 'slack:C123:123.456',
    review_token_hash: hashWorkRequestReviewToken(TOKEN),
    review_token_issued_at: '2026-08-16T10:00:00.000Z',
    review_token_expires_at: '2099-08-17T10:00:00.000Z',
    review_token_revoked_at: null,
    review_token_used_at: null,
    review_token_reissued_at: null,
    review_token_version: 1,
    token_refresh_idempotency_key: null,
    reminder_3h_sent_at: null,
    reminder_1h_sent_at: null,
    final_space_item_id: null,
    finalized_at: null,
    page_grader_receipt: {},
    clickup_receipt: {},
    sync_status: 'not_started',
    sync_attempt_count: 0,
    last_sync_attempt_at: null,
    next_retry_at: null,
    last_error: null,
    created_at: '2026-08-16T10:00:00.000Z',
    updated_at: '2026-08-16T10:00:00.000Z',
    ...overrides,
  }
}

function createService(repositoryOverrides: Record<string, unknown> = {}) {
  const repository = {
    client: {},
    findByTokenHash: vi.fn(),
    findById: vi.fn(),
    findByIdempotency: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    finalize: vi.fn(),
    listConnectionScopeRows: vi.fn().mockResolvedValue([]),
    listCampaignOptions: vi.fn().mockResolvedValue([]),
    listSpaceOptions: vi.fn().mockResolvedValue([]),
    findSpace: vi.fn(),
    findTask: vi.fn(),
    resolveOrgAssigneeByName: vi.fn().mockResolvedValue(null),
    assignTask: vi.fn(),
    listDueThreeHourReminders: vi.fn().mockResolvedValue([]),
    listDueOneHourWarnings: vi.fn().mockResolvedValue([]),
    listDueSyncRetries: vi.fn().mockResolvedValue([]),
    claimReminder: vi.fn(),
    ...repositoryOverrides,
  }
  const scope = {
    loadScopedOptions: vi.fn().mockResolvedValue({ clients: [], spaces: [] }),
    resolveSignedMapping: vi.fn(),
    resolveIntakeScope: vi.fn(),
    isScopedRow: vi.fn(
      (row: Record<string, unknown>, ownerUserId: string, ownerOrgId: string | null) =>
        ownerOrgId
          ? String(row.org_id ?? '') === ownerOrgId
          : String(row.user_id ?? '') === ownerUserId && row.org_id == null,
    ),
  }
  const pageGraderApi = { sendWork: vi.fn() }
  const slack = { sendMessage: vi.fn() }
  const config = { get: vi.fn().mockReturnValue('https://app.roas.io') }
  return {
    service: new WorkRequestService(
      repository as never,
      scope as never,
      pageGraderApi as never,
      slack as never,
      config as never,
    ),
    repository,
    scope,
    pageGraderApi,
    slack,
  }
}

describe('WorkRequestService', () => {
  it('hashes review tokens and sanitizes every internal authority field', () => {
    expect(hashWorkRequestReviewToken(TOKEN)).toMatch(/^[a-f0-9]{64}$/)
    const publicDraft = sanitizeWorkRequestDraft(draft())
    expect(publicDraft).not.toHaveProperty('review_token_hash')
    expect(publicDraft).not.toHaveProperty('provenance')
    expect(publicDraft).not.toHaveProperty('routing')
    expect(publicDraft).not.toHaveProperty('owner_user_id')
    expect(publicDraft.requester).toEqual({ name: 'Alex' })
    expect(publicDraft.resume_conversation_id).toBeNull()
  })

  it('builds Open ROAS task links with space, item, and owning org', () => {
    const publicDraft = sanitizeWorkRequestDraft(
      draft({
        final_space_item_id: '77777777-7777-7777-7777-777777777777',
        campaign_space_id: null,
        owner_org_id: '33333333-3333-3333-3333-333333333333',
        routing: {
          work_scope: 'general',
          general_space_id: '66666666-6666-6666-6666-666666666666',
        },
      }),
    )
    expect(publicDraft.task_url).toBe(
      '/spaces?space=66666666-6666-6666-6666-666666666666&item=77777777-7777-7777-7777-777777777777&org=33333333-3333-3333-3333-333333333333',
    )
  })

  it('exposes a resume conversation id when provenance carries one', () => {
    const publicDraft = sanitizeWorkRequestDraft(
      draft({
        provenance: {
          conversation_id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
          channel_id: 'C123',
        },
      }),
    )
    expect(publicDraft.resume_conversation_id).toBe('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee')
  })

  it('stamps a missing conversation onto an owned draft', async () => {
    const row = draft()
    const conversationId = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { id: conversationId },
      error: null,
    })
    const eqOrg = vi.fn(() => ({ maybeSingle }))
    const eqUser = vi.fn(() => ({ eq: eqOrg }))
    const eqId = vi.fn(() => ({ eq: eqUser }))
    const select = vi.fn(() => ({ eq: eqId }))
    const { service, repository } = createService({
      findById: vi.fn().mockResolvedValue(row),
      update: vi.fn().mockImplementation(async (_id: string, values: Record<string, unknown>) => ({
        ...row,
        ...values,
      })),
      client: {
        from: vi.fn(() => ({ select })),
      },
    })

    await expect(service.stampConversation(row.id, conversationId)).resolves.toEqual({
      stamped: true,
      draft_id: row.id,
      conversation_id: conversationId,
    })
    expect(repository.update).toHaveBeenCalledWith(
      row.id,
      expect.objectContaining({
        provenance: expect.objectContaining({ conversation_id: conversationId }),
      }),
    )
  })

  it('backfills resume conversation from slack provenance on getReview', async () => {
    const row = draft()
    const conversationId = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'
    const limit = vi.fn().mockResolvedValue({ data: [{ id: conversationId }], error: null })
    const chain: {
      eq: ReturnType<typeof vi.fn>
      is: ReturnType<typeof vi.fn>
      limit: typeof limit
    } = {
      eq: vi.fn(() => chain),
      is: vi.fn(() => chain),
      limit,
    }
    const { service, repository, scope } = createService({
      findByTokenHash: vi.fn().mockResolvedValue(row),
      update: vi.fn().mockImplementation(async (_id: string, values: Record<string, unknown>) => ({
        ...row,
        ...values,
      })),
      client: {
        from: vi.fn(() => ({
          select: vi.fn(() => chain),
        })),
      },
    })

    const result = await service.getReview(TOKEN)
    expect(result.state).toBe('draft')
    if (result.state !== 'draft') return
    expect(result.draft.resume_conversation_id).toBe(conversationId)
    expect(repository.update).toHaveBeenCalled()
    expect(scope.loadScopedOptions).toHaveBeenCalled()
  })

  it('rejects unknown anonymous update fields', () => {
    expect(
      UpdateWorkRequestDraftSchema.safeParse({
        title: 'Allowed',
        owner_user_id: '22222222-2222-2222-2222-222222222222',
      }).success,
    ).toBe(false)
    expect(
      UpdateWorkRequestDraftSchema.safeParse({
        structured_fields: { api_key: 'plaintext-secret' },
      }).success,
    ).toBe(false)
  })

  it.each([
    [draft({ review_token_expires_at: '2020-01-01T00:00:00.000Z' }), 'expired'],
    [draft({ status: 'revoked', review_token_revoked_at: '2026-08-16T11:00:00.000Z' }), 'revoked'],
  ])('returns safe terminal token states without draft data', async (row, state) => {
    const { service, repository } = createService({
      findByTokenHash: vi.fn().mockResolvedValue(row),
      update: vi.fn().mockResolvedValue({ ...row, status: 'expired' }),
    })
    const result = await service.getReview(TOKEN)
    expect(result.state).toBe(state)
    expect(result).not.toHaveProperty('draft')
    expect(repository.listConnectionScopeRows).not.toHaveBeenCalled()
  })

  it('keeps the canonical task when the Page Grader mirror fails', async () => {
    const finalDraft = draft({
      status: 'finalized',
      final_space_item_id: '77777777-7777-7777-7777-777777777777',
      review_token_used_at: '2026-08-16T12:00:00.000Z',
      sync_status: 'sync_pending',
    })
    const { service, repository, pageGraderApi } = createService({
      findByTokenHash: vi.fn().mockResolvedValue(draft()),
      findSpace: vi.fn().mockResolvedValue({
        id: '66666666-6666-6666-6666-666666666666',
        campaign_id: '44444444-4444-4444-4444-444444444444',
        user_id: '22222222-2222-2222-2222-222222222222',
        org_id: '33333333-3333-3333-3333-333333333333',
        deleted_at: null,
        schema: {
          custom_data: {
            space_role: 'general',
            page_grader_client_id: '55555555-5555-5555-5555-555555555555',
          },
        },
      }),
      finalize: vi.fn().mockResolvedValue({
        draft: finalDraft,
        task: {
          id: '77777777-7777-7777-7777-777777777777',
          space_id: '66666666-6666-6666-6666-666666666666',
        },
      }),
      update: vi
        .fn()
        .mockImplementation((_id, values) => Promise.resolve({ ...finalDraft, ...values })),
    })
    pageGraderApi.sendWork.mockRejectedValue(new Error('ClickUp unavailable'))

    const result = await service.finalizeReview(TOKEN)

    expect(repository.finalize).toHaveBeenCalledWith(hashWorkRequestReviewToken(TOKEN))
    expect(result.draft.final_task_id).toBe('77777777-7777-7777-7777-777777777777')
    expect(result.draft.sync_status).toBe('sync_failed')
    expect(repository.update).toHaveBeenCalledWith(
      finalDraft.id,
      expect.objectContaining({ sync_status: 'sync_failed' }),
    )
  })

  it('mirrors finalize without repeating the brief as source_excerpt', async () => {
    const finalDraft = draft({
      status: 'finalized',
      final_space_item_id: '77777777-7777-7777-7777-777777777777',
      review_token_used_at: '2026-08-16T12:00:00.000Z',
      sync_status: 'sync_pending',
      assignee_name: 'Sam Editor',
      description:
        'Edit the 12 hook-and-body videos.\n\nSource folder: https://drive.google.com/drive/folders/abc\n\nContext: Next webinar.',
    })
    const { service, repository, pageGraderApi } = createService({
      findByTokenHash: vi.fn().mockResolvedValue(draft()),
      findSpace: vi.fn().mockResolvedValue({
        id: '66666666-6666-6666-6666-666666666666',
        campaign_id: '44444444-4444-4444-4444-444444444444',
        user_id: '22222222-2222-2222-2222-222222222222',
        org_id: '33333333-3333-3333-3333-333333333333',
        deleted_at: null,
        schema: {
          custom_data: {
            space_role: 'general',
            page_grader_client_id: '55555555-5555-5555-5555-555555555555',
          },
        },
      }),
      finalize: vi.fn().mockResolvedValue({
        draft: finalDraft,
        task: {
          id: '77777777-7777-7777-7777-777777777777',
          space_id: '66666666-6666-6666-6666-666666666666',
        },
      }),
      update: vi
        .fn()
        .mockImplementation((_id, values) => Promise.resolve({ ...finalDraft, ...values })),
      resolveOrgAssigneeByName: vi.fn().mockResolvedValue(null),
    })
    pageGraderApi.sendWork.mockResolvedValue({
      success: true,
      results: [
        {
          space_item_id: '77777777-7777-7777-7777-777777777777',
          status: 'created',
          clickup_task_id: 'cu-1',
          clickup_task_url: 'https://app.clickup.com/t/cu-1',
        },
      ],
    })

    await service.finalizeReview(TOKEN)

    expect(pageGraderApi.sendWork).toHaveBeenCalledWith(
      expect.anything(),
      finalDraft.owner_user_id,
      expect.objectContaining({
        client_id: finalDraft.page_grader_external_client_id,
        origin: 'page_grader',
        space_item_ids: [finalDraft.final_space_item_id],
        work_kind: 'task_request',
        task_type: 'funnel',
        assignee: { name: 'Sam Editor' },
        note: `Finalized from ROAS Service Request ${finalDraft.id}.`,
      }),
      finalDraft.owner_org_id,
      'owner',
    )
    const payload = pageGraderApi.sendWork.mock.calls[0]?.[2] as Record<string, unknown>
    expect(payload).not.toHaveProperty('source_excerpt')
    expect(payload).not.toHaveProperty('campaign_id')
  })

  it('mirrors the selected Portal campaign on finalize', async () => {
    const campaignId = '99999999-9999-9999-9999-999999999999'
    const campaignDraft = draft({
      campaign_space_id: '88888888-8888-8888-8888-888888888888',
      page_grader_external_campaign_id: campaignId,
      routing: { work_scope: 'campaign', general_space_id: '66666666-6666-6666-6666-666666666666' },
    })
    const finalDraft = draft({
      ...campaignDraft,
      status: 'finalized',
      final_space_item_id: '77777777-7777-7777-7777-777777777777',
      review_token_used_at: '2026-08-16T12:00:00.000Z',
      sync_status: 'sync_pending',
    })
    const { service, pageGraderApi } = createService({
      findByTokenHash: vi.fn().mockResolvedValue(campaignDraft),
      findSpace: vi.fn().mockResolvedValue({
        id: '88888888-8888-8888-8888-888888888888',
        campaign_id: '44444444-4444-4444-4444-444444444444',
        user_id: '22222222-2222-2222-2222-222222222222',
        org_id: '33333333-3333-3333-3333-333333333333',
        deleted_at: null,
        schema: {
          custom_data: {
            space_role: 'client_campaign',
            page_grader_campaign_id: campaignId,
          },
        },
      }),
      finalize: vi.fn().mockResolvedValue({
        draft: finalDraft,
        task: {
          id: '77777777-7777-7777-7777-777777777777',
          space_id: '88888888-8888-8888-8888-888888888888',
        },
      }),
      update: vi
        .fn()
        .mockImplementation((_id, values) => Promise.resolve({ ...finalDraft, ...values })),
    })
    pageGraderApi.sendWork.mockResolvedValue({
      success: true,
      results: [
        {
          space_item_id: '77777777-7777-7777-7777-777777777777',
          status: 'created',
          clickup_task_id: 'cu-1',
          clickup_task_url: 'https://app.clickup.com/t/cu-1',
        },
      ],
    })

    await service.finalizeReview(TOKEN)

    expect(pageGraderApi.sendWork).toHaveBeenCalledWith(
      expect.anything(),
      finalDraft.owner_user_id,
      expect.objectContaining({
        campaign_id: campaignId,
        origin: 'page_grader',
      }),
      finalDraft.owner_org_id,
      'owner',
    )
  })

  it('returns the existing native task for an idempotent finalization replay', async () => {
    const finalized = draft({
      status: 'finalized',
      final_space_item_id: '77777777-7777-7777-7777-777777777777',
      review_token_used_at: '2026-08-16T12:00:00.000Z',
      sync_status: 'synced',
    })
    const { service, repository, pageGraderApi } = createService({
      findByTokenHash: vi.fn().mockResolvedValue(finalized),
    })

    await expect(service.finalizeReview(TOKEN)).resolves.toMatchObject({
      state: 'finalized',
      final_task_id: '77777777-7777-7777-7777-777777777777',
      sync_status: 'synced',
    })
    expect(repository.finalize).not.toHaveBeenCalled()
    expect(pageGraderApi.sendWork).not.toHaveBeenCalled()
  })

  it('resolves the signed mapping and creates one campaign-scoped draft', async () => {
    const { service, repository, scope } = createService()
    scope.resolveIntakeScope.mockResolvedValue({
      mapping: {
        userId: '22222222-2222-2222-2222-222222222222',
        orgId: '33333333-3333-3333-3333-333333333333',
        clientId: '55555555-5555-5555-5555-555555555555',
        entry: {
          campaign_id: '44444444-4444-4444-4444-444444444444',
          space_id: '66666666-6666-6666-6666-666666666666',
        },
      },
      ownerOrgId: '33333333-3333-3333-3333-333333333333',
      generalSpace: {
        id: '66666666-6666-6666-6666-666666666666',
      },
      campaignSpace: {
        id: '88888888-8888-8888-8888-888888888888',
      },
    })
    repository.findByIdempotency.mockResolvedValue(null)
    repository.create.mockImplementation((values) =>
      Promise.resolve(draft({ ...(values as Partial<WorkRequestDraftRow>) })),
    )

    const result = await service.createFromPageGrader('signed-secret', {
      client_id: '55555555-5555-5555-5555-555555555555',
      client_name: 'Example Client',
      campaign_id: '99999999-9999-9999-9999-999999999999',
      request_type: 'funnel',
      assignee_name: null,
      title: 'Build launch funnel',
      description: null,
      priority: 'high',
      structured_fields: {},
      required_fields: [],
      assets: [],
      dependencies: [],
      provenance: {},
      requester: {},
      work_scope: 'campaign',
      idempotency_key: 'event-1',
    })

    expect(result.state).toBe('created')
    expect(result.review_url).toMatch(/^https:\/\/app\.roas\.io\/request-review\//)
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        campaign_space_id: '88888888-8888-8888-8888-888888888888',
        page_grader_external_campaign_id: '99999999-9999-9999-9999-999999999999',
      }),
    )
  })

  it('does not duplicate an idempotent draft', async () => {
    const existing = draft()
    const { service, repository, scope } = createService({
      findByIdempotency: vi.fn().mockResolvedValue(existing),
      update: vi
        .fn()
        .mockImplementation((_id, values) => Promise.resolve({ ...existing, ...values })),
    })
    scope.resolveIntakeScope.mockResolvedValue({
      mapping: {
        userId: existing.owner_user_id,
        orgId: existing.owner_org_id,
        entry: { campaign_id: existing.campaign_id },
      },
      ownerOrgId: existing.owner_org_id,
      generalSpace: null,
      campaignSpace: null,
    })

    const result = await service.createFromPageGrader('signed-secret', {
      client_id: existing.page_grader_external_client_id,
      client_name: 'Example Client',
      request_type: 'funnel',
      assignee_name: null,
      title: existing.title,
      description: existing.description,
      priority: 'high',
      structured_fields: {},
      required_fields: [],
      assets: [],
      dependencies: [],
      provenance: {},
      requester: {},
      work_scope: 'general',
      idempotency_key: existing.idempotency_key,
    })

    expect(result.draft_id).toBe(existing.id)
    expect(result.state).toBe('existing')
    expect(result.review_url).toMatch(/^https:\/\/app\.roas\.io\/request-review\//)
    expect(repository.update).toHaveBeenCalledWith(
      existing.id,
      expect.objectContaining({
        review_token_hash: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    )
    expect(repository.create).not.toHaveBeenCalled()
  })

  it('reissues a signed refresh without storing or returning the old raw token', async () => {
    const expired = draft({
      status: 'expired',
      routing: {
        connection_org_id: null,
        origin_page_grader_client_id: '55555555-5555-5555-5555-555555555555',
      },
    })
    const { service, repository, scope } = createService({
      findById: vi.fn().mockResolvedValue(expired),
      update: vi
        .fn()
        .mockImplementation((_id, values) => Promise.resolve({ ...expired, ...values })),
    })
    scope.resolveSignedMapping.mockResolvedValue({
      userId: expired.owner_user_id,
      orgId: null,
      entry: { campaign_id: expired.campaign_id },
    })

    const result = await service.refreshFromPageGrader('signed-secret', {
      draft_id: expired.id,
      client_id: '55555555-5555-5555-5555-555555555555',
      idempotency_key: 'refresh-1',
    })

    expect(result.state).toBe('refreshed')
    expect(result.review_url).toMatch(/^https:\/\/app\.roas\.io\/request-review\//)
    expect(result.review_url).not.toContain(TOKEN)
    expect(repository.update).toHaveBeenCalledWith(
      expired.id,
      expect.objectContaining({
        status: 'draft',
        review_token_hash: expect.stringMatching(/^[a-f0-9]{64}$/),
        token_refresh_idempotency_key: 'refresh-1',
      }),
    )
  })

  it('claims reminders once before sending', async () => {
    const { service, repository, slack } = createService({
      listDueThreeHourReminders: vi.fn().mockResolvedValue([draft()]),
      claimReminder: vi.fn().mockResolvedValue(false),
    })

    await expect(service.processDueReminders()).resolves.toEqual({ processed: 1, sent: 0 })
    expect(repository.claimReminder).toHaveBeenCalledTimes(1)
    expect(slack.sendMessage).not.toHaveBeenCalled()
  })
})
