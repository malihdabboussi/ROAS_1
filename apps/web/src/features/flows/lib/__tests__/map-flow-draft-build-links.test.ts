import { describe, expect, it } from 'vitest'
import {
  findDraftForBuildSession,
  listOrphanFlowBuildSessions,
  mapFlowDraftBuildLinks,
  resolveLoopChatLinkedFlow,
  resolveLoopChatLinkUiState,
} from '../map-flow-draft-build-links'

describe('mapFlowDraftBuildLinks', () => {
  it('prefers automation_id match over target_automation_id', () => {
    const drafts = [
      {
        id: 'draft-1',
        name: 'Draft',
        enabled: false,
        is_draft: true,
        trigger: { type: 'task_created' },
        actions: [],
      },
    ]
    const sessions = [
      {
        id: 'session-a',
        conversation_id: 'conv-a',
        automation_id: 'draft-1',
        target_automation_id: null,
        status: 'planning',
        plan_name: 'Plan A',
        updated_at: null,
      },
      {
        id: 'session-b',
        conversation_id: 'conv-b',
        automation_id: null,
        target_automation_id: 'draft-1',
        status: 'intake',
        plan_name: null,
        updated_at: null,
      },
    ]

    const links = mapFlowDraftBuildLinks(drafts, sessions)
    expect(links.get('draft-1')).toEqual({
      sessionId: 'session-a',
      conversationId: 'conv-a',
      draftFlowId: 'draft-1',
    })
  })

  it('falls back to target_automation_id when automation_id is missing', () => {
    const drafts = [
      {
        id: 'draft-2',
        name: 'Draft',
        enabled: false,
        is_draft: true,
        trigger: { type: 'task_created' },
        actions: [],
      },
    ]
    const sessions = [
      {
        id: 'session-c',
        conversation_id: 'conv-c',
        automation_id: null,
        target_automation_id: 'draft-2',
        status: 'planning',
        plan_name: 'Update draft',
        updated_at: null,
      },
    ]

    const links = mapFlowDraftBuildLinks(drafts, sessions)
    expect(links.get('draft-2')).toEqual({
      sessionId: 'session-c',
      conversationId: 'conv-c',
      draftFlowId: 'draft-2',
    })
  })

  it('links build sessions to drafts by matching plan name when ids are unset', () => {
    const drafts = [
      {
        id: 'draft-3',
        name: 'Comment on Task Completed',
        enabled: false,
        is_draft: true,
        trigger: { type: 'task_created' },
        actions: [{ type: 'add_comment', message_template: 'Hi' }],
      },
    ]
    const sessions = [
      {
        id: 'session-name',
        conversation_id: 'conv-name',
        automation_id: null,
        target_automation_id: null,
        status: 'planned',
        plan_name: 'Comment on Task Completed',
        updated_at: null,
      },
    ]

    const links = mapFlowDraftBuildLinks(drafts, sessions)
    expect(links.get('draft-3')).toEqual({
      sessionId: 'session-name',
      conversationId: 'conv-name',
      draftFlowId: 'draft-3',
    })
  })

  it('links sessions when automation_id matches draft automation_id', () => {
    const drafts = [
      {
        id: 'draft-row-id',
        automation_id: 'automation-1',
        name: 'Comment on Task Completed',
        enabled: false,
        is_draft: true,
        trigger: { type: 'task_created' },
        actions: [],
      },
    ]
    const sessions = [
      {
        id: 'session-auto',
        conversation_id: 'conv-auto',
        automation_id: 'automation-1',
        target_automation_id: null,
        status: 'planned',
        plan_name: 'Different plan title',
        updated_at: null,
      },
    ]

    expect(mapFlowDraftBuildLinks(drafts, sessions).get('draft-row-id')).toEqual({
      sessionId: 'session-auto',
      conversationId: 'conv-auto',
      draftFlowId: 'draft-row-id',
    })
  })

  it('matches update-prefixed plan names to draft titles', () => {
    const drafts = [
      {
        id: 'draft-4',
        name: 'Comment on Task Completed',
        enabled: false,
        is_draft: true,
        trigger: { type: 'task_created' },
        actions: [],
      },
    ]
    const sessions = [
      {
        id: 'session-update-name',
        conversation_id: 'conv-update',
        automation_id: null,
        target_automation_id: null,
        status: 'planned',
        plan_name: 'Update Comment on Task Completed',
        updated_at: null,
      },
    ]

    expect(mapFlowDraftBuildLinks(drafts, sessions).get('draft-4')?.sessionId).toBe(
      'session-update-name',
    )
  })
})

describe('listOrphanFlowBuildSessions', () => {
  it('returns build sessions without a matching draft flow card', () => {
    const orphans = listOrphanFlowBuildSessions(
      [],
      [
        {
          id: 'session-orphan',
          conversation_id: 'conv-1',
          automation_id: null,
          target_automation_id: null,
          status: 'intake',
          plan_name: 'New flow build',
          updated_at: null,
        },
      ],
    )

    expect(orphans).toHaveLength(1)
    expect(orphans[0]?.id).toBe('session-orphan')
  })

  it('hides sessions already linked to a visible draft flow', () => {
    const orphans = listOrphanFlowBuildSessions(
      [
        {
          id: 'draft-1',
          name: 'Draft',
          enabled: false,
          is_draft: true,
          trigger: { type: 'task_created' },
          actions: [],
        },
      ],
      [
        {
          id: 'session-linked',
          conversation_id: 'conv-1',
          automation_id: 'draft-1',
          target_automation_id: null,
          status: 'planning',
          plan_name: 'Plan',
          updated_at: null,
        },
      ],
    )

    expect(orphans).toHaveLength(0)
  })

  it('hides sessions linked only by matching plan name', () => {
    const orphans = listOrphanFlowBuildSessions(
      [
        {
          id: 'draft-1',
          name: 'Comment on Task Completed',
          enabled: false,
          is_draft: true,
          trigger: { type: 'task_created' },
          actions: [],
        },
      ],
      [
        {
          id: 'session-name',
          conversation_id: 'conv-1',
          automation_id: null,
          target_automation_id: null,
          status: 'planned',
          plan_name: 'Comment on Task Completed',
          updated_at: null,
        },
      ],
    )

    expect(orphans).toHaveLength(0)
  })

  it('hides extra build sessions when a draft already has one linked session', () => {
    const orphans = listOrphanFlowBuildSessions(
      [
        {
          id: 'draft-1',
          name: 'Comment on Task Completed',
          enabled: false,
          is_draft: true,
          trigger: { type: 'task_status_changed' },
          actions: [{ type: 'add_comment' }],
        },
      ],
      [
        {
          id: 'session-linked',
          conversation_id: 'conv-linked',
          automation_id: 'draft-1',
          target_automation_id: null,
          status: 'planning',
          plan_name: 'Comment on Task Completed',
          updated_at: '2026-06-30T12:00:00.000Z',
        },
        {
          id: 'session-duplicate',
          conversation_id: 'conv-duplicate',
          automation_id: null,
          target_automation_id: null,
          status: 'planned',
          plan_name: 'Comment on Task Completed',
          updated_at: '2026-06-30T11:00:00.000Z',
        },
      ],
    )

    expect(orphans).toHaveLength(0)
  })

  it('hides sessions linked to a published flow by automation id or plan name', () => {
    const publishedFlow = {
      id: 'flow-published',
      name: 'When a task is created in this Space, automatically create a follow-up task',
      enabled: false,
      is_draft: false,
      trigger: { type: 'task_created' },
      actions: [{ type: 'create_task' }],
    }
    const orphansById = listOrphanFlowBuildSessions(
      [],
      [
        {
          id: 'session-published-id',
          conversation_id: 'conv-1',
          automation_id: 'flow-published',
          target_automation_id: null,
          status: 'compiled',
          plan_name: publishedFlow.name,
          updated_at: null,
        },
      ],
      [publishedFlow],
    )
    const orphansByName = listOrphanFlowBuildSessions(
      [],
      [
        {
          id: 'session-published-name',
          conversation_id: 'conv-2',
          automation_id: null,
          target_automation_id: null,
          status: 'compiled',
          plan_name: publishedFlow.name,
          updated_at: null,
        },
      ],
      [publishedFlow],
    )

    expect(orphansById).toHaveLength(0)
    expect(orphansByName).toHaveLength(0)
  })

  it('finds a draft for a build session by plan name', () => {
    const drafts = [
      {
        id: 'draft-1',
        name: 'Comment on Task Completed',
        enabled: false,
        is_draft: true,
        trigger: { type: 'task_created' },
        actions: [],
      },
    ]
    const session = {
      id: 'session-name',
      conversation_id: 'conv-1',
      automation_id: null,
      target_automation_id: null,
      status: 'planned',
      plan_name: 'Comment on Task Completed',
      updated_at: null,
    }

    expect(findDraftForBuildSession(session, drafts)?.id).toBe('draft-1')
  })
})

describe('resolveLoopChatLinkedFlow', () => {
  it('resolves the flow linked to the active Loop conversation', () => {
    const drafts = [
      {
        id: 'draft-1',
        name: 'Fathom Recording: Summarize and Notify',
        enabled: false,
        is_draft: true,
        trigger: { type: 'external_fathom_recording_ready' },
        actions: [{ type: 'send_slack_message' }],
      },
    ]
    const sessions = [
      {
        id: 'session-1',
        conversation_id: 'conv-1',
        automation_id: 'draft-1',
        target_automation_id: null,
        status: 'compiled',
        plan_name: 'Fathom Recording: Summarize and Notify',
        updated_at: '2026-06-30T00:00:00.000Z',
      },
      {
        id: 'session-2',
        conversation_id: 'conv-2',
        automation_id: null,
        target_automation_id: null,
        status: 'intake',
        plan_name: 'Other build',
        updated_at: '2026-06-29T00:00:00.000Z',
      },
    ]

    expect(
      resolveLoopChatLinkedFlow({
        conversationId: 'conv-1',
        sessions,
        drafts,
        flows: drafts,
      }),
    ).toEqual({
      sessionId: 'session-1',
      conversationId: 'conv-1',
      flowId: 'draft-1',
      flowName: 'Fathom Recording: Summarize and Notify',
      spaceId: null,
    })
  })

  it('returns null when the conversation has no linked build session', () => {
    expect(
      resolveLoopChatLinkedFlow({
        conversationId: 'conv-missing',
        sessions: [],
        drafts: [],
        flows: [],
      }),
    ).toBeNull()
  })
})

describe('resolveLoopChatLinkUiState', () => {
  it('returns open when the conversation resolves to a linked draft', () => {
    const drafts = [
      {
        id: 'draft-1',
        name: 'Comment on Task Completed',
        enabled: false,
        is_draft: true,
        trigger: { type: 'status_change' },
        actions: [{ type: 'add_comment' }],
      },
    ]
    const sessions = [
      {
        id: 'session-1',
        conversation_id: 'conv-1',
        automation_id: 'draft-1',
        target_automation_id: null,
        status: 'planned',
        plan_name: 'Comment on Task Completed',
        updated_at: null,
      },
    ]

    expect(
      resolveLoopChatLinkUiState({
        conversationId: 'conv-1',
        sessions,
        drafts,
        flows: drafts,
      }),
    ).toEqual({
      kind: 'open',
      link: {
        sessionId: 'session-1',
        conversationId: 'conv-1',
        flowId: 'draft-1',
        flowName: 'Comment on Task Completed',
        spaceId: null,
      },
    })
  })

  it('returns no-loop when the conversation has a session but no draft', () => {
    expect(
      resolveLoopChatLinkUiState({
        conversationId: 'conv-1',
        sessions: [
          {
            id: 'session-1',
            conversation_id: 'conv-1',
            automation_id: null,
            target_automation_id: null,
            status: 'intake',
            plan_name: 'New flow build',
            updated_at: null,
          },
        ],
        drafts: [],
        flows: [],
      }),
    ).toEqual({ kind: 'no-loop' })
  })

  it('returns hidden when there is no active conversation', () => {
    expect(
      resolveLoopChatLinkUiState({
        conversationId: null,
        sessions: [],
        drafts: [],
        flows: [],
      }),
    ).toEqual({ kind: 'hidden' })
  })
})
