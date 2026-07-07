import { ForbiddenException } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import { AgentFeedbackService } from '../agent-feedback.service'

const supabase = { from: vi.fn() } as unknown as SupabaseClient
const USER_ID = '11111111-1111-4111-8111-111111111111'
const ORG_ID = '22222222-2222-4222-8222-222222222222'
const MESSAGE_ID = '33333333-3333-4333-8333-333333333333'
const CONVERSATION_ID = '44444444-4444-4444-8444-444444444444'
const ACTIVITY_ID = '55555555-5555-4555-8555-555555555555'
const MISSION_LOG_ID = '66666666-6666-4666-8666-666666666666'

function makeService(overrides: Record<string, unknown> = {}) {
  const repository = {
    findConversationMessage: vi.fn(async () => ({
      id: MESSAGE_ID,
      conversation_id: CONVERSATION_ID,
      role: 'assistant',
      metadata: { agent_key: 'designer' },
      created_at: '2026-06-24T10:00:00.000Z',
      conversations: {
        id: CONVERSATION_ID,
        user_id: 'owner-1',
        org_id: ORG_ID,
        agent_id: 'designer',
        campaign_id: 'campaign-1',
      },
    })),
    findSpaceItemActivity: vi.fn(async () => ({
      id: ACTIVITY_ID,
      org_id: ORG_ID,
      space_id: 'space-1',
      item_id: 'item-1',
      event_type: 'agent_task_execution',
      actor_kind: 'agent',
      payload: { agent_key: 'task-agent', content: 'Updated the task' },
      created_at: '2026-06-24T10:00:00.000Z',
    })),
    findMissionLog: vi.fn(async () => ({
      id: MISSION_LOG_ID,
      org_id: ORG_ID,
      mission_id: 'mission-1',
      event_type: 'mission.progress',
      agent_key: 'planner',
      payload: { note: 'Drafted the plan' },
      created_at: '2026-06-24T10:00:00.000Z',
    })),
    upsertFeedback: vi.fn(async (_supabase: SupabaseClient, payload: Record<string, unknown>) => ({
      ...payload,
      id: 'feedback-1',
      created_at: '2026-06-24T10:00:00.000Z',
      updated_at: '2026-06-24T10:00:00.000Z',
    })),
    lookupFeedback: vi.fn(async () => []),
    ...overrides,
  }
  const permissions = {
    assertCanAccessConversation: vi.fn(async () => 'view'),
  }
  const service = new AgentFeedbackService(repository as never, permissions as never)
  return { service, repository, permissions }
}

describe('AgentFeedbackService', () => {
  it('saves a thumbs vote for an accessible assistant message', async () => {
    const { service, repository, permissions } = makeService()

    const result = await service.saveFeedback(supabase, USER_ID, {
      orgId: ORG_ID,
      orgRole: 'viewer',
    } as never, {
      target_kind: 'conversation_message',
      target_id: MESSAGE_ID,
      thumbs_up: false,
      source_surface: 'studio_chat',
    })

    expect(permissions.assertCanAccessConversation).toHaveBeenCalledWith(
      supabase,
      USER_ID,
      'viewer',
      CONVERSATION_ID,
      'view',
      ORG_ID,
    )
    expect(repository.upsertFeedback).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({
        user_id: USER_ID,
        org_id: ORG_ID,
        target_kind: 'conversation_message',
        target_id: MESSAGE_ID,
        agent_key: 'designer',
        thumbs_up: false,
        tags: [],
        feedback_text: null,
        source_surface: 'studio_chat',
      }),
    )
    expect(result).toMatchObject({ id: 'feedback-1', thumbs_up: false })
  })

  it('rejects non-assistant conversation messages', async () => {
    const { service, repository } = makeService({
      findConversationMessage: vi.fn(async () => ({
        id: MESSAGE_ID,
        conversation_id: CONVERSATION_ID,
        role: 'user',
        metadata: {},
        conversations: { org_id: ORG_ID, agent_id: 'designer' },
      })),
    })

    await expect(
      service.saveFeedback(supabase, USER_ID, {
        orgId: ORG_ID,
        orgRole: 'viewer',
      } as never, {
        target_kind: 'conversation_message',
        target_id: MESSAGE_ID,
        thumbs_up: true,
        source_surface: 'studio_chat',
      }),
    ).rejects.toThrow('assistant')
    expect(repository.upsertFeedback).not.toHaveBeenCalled()
  })

  it('updates the same target with tags and optional text', async () => {
    const { service, repository } = makeService()

    await service.saveFeedback(supabase, USER_ID, {
      orgId: ORG_ID,
      orgRole: 'viewer',
    } as never, {
      target_kind: 'conversation_message',
      target_id: MESSAGE_ID,
      thumbs_up: true,
      tags: ['helpful', 'clear'],
      feedback_text: 'This was exactly the right next step.',
      source_surface: 'studio_chat',
    })

    expect(repository.upsertFeedback).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({
        thumbs_up: true,
        tags: ['helpful', 'clear'],
        feedback_text: 'This was exactly the right next step.',
      }),
    )
  })

  it('resolves task activity and mission log agent targets server-side', async () => {
    const { service, repository } = makeService()

    await service.saveFeedback(supabase, USER_ID, {
      orgId: ORG_ID,
      orgRole: 'editor',
    } as never, {
      target_kind: 'space_item_activity',
      target_id: ACTIVITY_ID,
      thumbs_up: true,
      source_surface: 'task_activity',
    })
    await service.saveFeedback(supabase, USER_ID, {
      orgId: ORG_ID,
      orgRole: 'editor',
    } as never, {
      target_kind: 'mission_log',
      target_id: MISSION_LOG_ID,
      thumbs_up: false,
      source_surface: 'mission_activity',
    })

    expect(repository.upsertFeedback).toHaveBeenNthCalledWith(
      1,
      supabase,
      expect.objectContaining({
        target_kind: 'space_item_activity',
        target_id: ACTIVITY_ID,
        agent_key: 'task-agent',
      }),
    )
    expect(repository.upsertFeedback).toHaveBeenNthCalledWith(
      2,
      supabase,
      expect.objectContaining({
        target_kind: 'mission_log',
        target_id: MISSION_LOG_ID,
        agent_key: 'planner',
      }),
    )
  })

  it('does not save feedback when the target is inaccessible', async () => {
    const { service, repository, permissions } = makeService()
    permissions.assertCanAccessConversation.mockRejectedValueOnce(new ForbiddenException('no'))

    await expect(
      service.saveFeedback(supabase, USER_ID, {
        orgId: ORG_ID,
        orgRole: 'viewer',
      } as never, {
        target_kind: 'conversation_message',
        target_id: MESSAGE_ID,
        thumbs_up: true,
        source_surface: 'studio_chat',
      }),
    ).rejects.toThrow('no')
    expect(repository.upsertFeedback).not.toHaveBeenCalled()
  })

  it('looks up only the current user feedback rows for rendered targets', async () => {
    const { service, repository } = makeService({
      lookupFeedback: vi.fn(async () => [
        {
          target_kind: 'conversation_message',
          target_id: MESSAGE_ID,
          thumbs_up: true,
          tags: ['helpful'],
        },
      ]),
    })

    const result = await service.lookupFeedback(supabase, USER_ID, [
      { target_kind: 'conversation_message', target_id: MESSAGE_ID },
    ])

    expect(repository.lookupFeedback).toHaveBeenCalledWith(supabase, USER_ID, [
      { target_kind: 'conversation_message', target_id: MESSAGE_ID },
    ])
    expect(result.feedback).toEqual([
      expect.objectContaining({
        target_kind: 'conversation_message',
        target_id: MESSAGE_ID,
        thumbs_up: true,
      }),
    ])
  })
})
