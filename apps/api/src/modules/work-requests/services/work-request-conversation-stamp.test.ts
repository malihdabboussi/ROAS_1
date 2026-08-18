import { describe, expect, it, vi } from 'vitest'
import type { WorkRequestDraftRow } from '../repositories/work-request.repository'
import {
  mergeConversationIntoProvenance,
  readSlackThreadProvenance,
  resolveConversationFromSlackProvenance,
} from './work-request-conversation-stamp'

const CONV = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'

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
    description: null,
    due_at: null,
    priority: 'high',
    structured_fields: {},
    required_fields: [],
    missing_fields: [],
    assets: [],
    dependencies: [],
    provenance: { channel_id: 'C123', thread_ts: '123.456' },
    routing: {},
    requester_metadata: {},
    status: 'draft',
    idempotency_key: 'key',
    review_token_hash: 'hash',
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

describe('work-request-conversation-stamp', () => {
  it('merges conversation into provenance root and context', () => {
    expect(mergeConversationIntoProvenance({ channel_id: 'C1', context: { a: 1 } }, CONV)).toEqual({
      channel_id: 'C1',
      conversation_id: CONV,
      context: { a: 1, conversation_id: CONV },
    })
  })

  it('reads slack channel/thread from nested provenance', () => {
    expect(
      readSlackThreadProvenance({
        context: { slack_channel_id: 'C9', slack_thread_ts: '9.9' },
      }),
    ).toEqual({ channelId: 'C9', threadTs: '9.9' })
  })

  it('uses message_ts as the thread parent when thread_ts is missing', () => {
    expect(
      readSlackThreadProvenance({
        channel_id: 'C123',
        message_ts: '111.222',
      }),
    ).toEqual({ channelId: 'C123', threadTs: '111.222' })
  })

  it('resolves exactly one matching slack conversation', async () => {
    const limit = vi.fn().mockResolvedValue({ data: [{ id: CONV }], error: null })
    const chain: {
      eq: ReturnType<typeof vi.fn>
      is: ReturnType<typeof vi.fn>
      limit: typeof limit
    } = {
      eq: vi.fn(() => chain),
      is: vi.fn(() => chain),
      limit,
    }
    const client = {
      from: vi.fn(() => ({
        select: vi.fn(() => chain),
      })),
    }

    await expect(
      resolveConversationFromSlackProvenance({
        client: client as never,
        draft: draft(),
      }),
    ).resolves.toBe(CONV)
    expect(limit).toHaveBeenCalledWith(2)
  })

  it('skips resolve when provenance already has a conversation', async () => {
    const client = { from: vi.fn() }
    await expect(
      resolveConversationFromSlackProvenance({
        client: client as never,
        draft: draft({ provenance: { conversation_id: CONV, channel_id: 'C123' } }),
      }),
    ).resolves.toBeNull()
    expect(client.from).not.toHaveBeenCalled()
  })
})
