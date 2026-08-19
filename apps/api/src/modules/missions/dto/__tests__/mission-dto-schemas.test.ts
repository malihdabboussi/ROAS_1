import { describe, expect, it } from 'vitest'
import {
  AwarenessAppendSubtasksDtoSchema,
  CompleteHumanSubtaskDtoSchema,
  CreateMissionDtoSchema,
  CreateMissionPlanDtoSchema,
  ExtendMissionDtoSchema,
  FireAgentDtoSchema,
  HUMAN_ASSIGN_PREFIX_VALUE,
  InternalCreateMissionDtoSchema,
  MissionListQuerySchema,
  parseAssignTo,
  RateMissionDtoSchema,
} from '../index'

const missionId = '11111111-1111-4111-8111-111111111111'
const userId = '22222222-2222-4222-8222-222222222222'
const orgId = '33333333-3333-4333-8333-333333333333'
const subtaskId = '44444444-4444-4444-8444-444444444444'

describe('mission DTO schemas', () => {
  it('parses mission creation and list query inputs', () => {
    expect(
      CreateMissionDtoSchema.parse({
        title: 'Create onboarding checklist',
        brief: 'Make the first-run setup obvious',
        priority: 'high',
        assigned_agent_key: 'operator',
        input: { source: 'test' },
        idempotency_key: 'mission-create-1',
        scheduled_at: null,
      }),
    ).toMatchObject({
      title: 'Create onboarding checklist',
      priority: 'high',
    })

    expect(
      MissionListQuerySchema.parse({
        status: 'in_progress',
        agent_keys: 'operator,reviewer',
        limit: '10',
      }),
    ).toEqual({
      status: 'in_progress',
      agent_keys: ['operator', 'reviewer'],
      limit: 10,
    })
  })

  it('parses mission plan harness data and human assignee prefixes', () => {
    const parsed = CreateMissionPlanDtoSchema.parse({
      mission_id: missionId,
      user_id: userId,
      org_id: orgId,
      title: 'Plan launch checklist',
      summary: 'Launch needs implementation and validation.',
      approach: 'Split into implementation and review steps.',
      harness: {
        contextSnapshot: {
          summary: 'Enough context to plan.',
          sources: [{ sourceType: 'brief', title: 'Launch brief' }],
        },
        assertions: [
          {
            assertionKey: 'launch-ready',
            category: 'quality',
            statement: 'The launch checklist is actionable.',
          },
        ],
      },
      subtasks: [
        {
          id: 'plan-step-1',
          title: 'Draft checklist',
          assignTo: `${HUMAN_ASSIGN_PREFIX_VALUE}${userId}`,
          intent: {
            why: 'Make launch clear',
            story: 'User needs the checklist',
            sensory: 'Readable checklist',
            endState: 'Checklist is ready',
            ecology: 'No extra scope',
          },
          assertionKeys: ['launch-ready'],
          publishToTaskList: true,
        },
      ],
      assignTo: 'operator',
    })

    expect(parsed.subtasks[0]?.assignTo).toBe(`${HUMAN_ASSIGN_PREFIX_VALUE}${userId}`)
    expect(parsed.subtasks[0]?.publishToTaskList).toBe(true)
    expect(parseAssignTo(parsed.subtasks[0]!.assignTo)).toEqual({
      type: 'human',
      agent_key: null,
      user_id: userId,
    })
    expect(parseAssignTo('operator')).toEqual({
      type: 'agent',
      agent_key: 'operator',
      user_id: null,
    })
  })

  it('accepts detailed deterministic playbook ecology instructions', () => {
    const detailedEcology = 'Use grounded campaign evidence. '.repeat(100)

    const parsed = CreateMissionPlanDtoSchema.parse({
      mission_id: missionId,
      user_id: userId,
      org_id: orgId,
      title: 'Ads Research',
      summary: 'Research current and competitive ads.',
      approach: 'Use the deterministic ads research playbook.',
      subtasks: [
        {
          id: 'research-context',
          title: 'Prepare campaign research context',
          assignTo: 'atlas',
          intent: {
            why: 'Ground the research',
            story: 'Verify the client before interpreting ads',
            sensory: 'A source-backed context document',
            endState: 'Verified context exists',
            ecology: detailedEcology,
          },
        },
      ],
      assignTo: 'blaze',
    })

    expect(parsed.subtasks[0]?.intent.ecology).toBe(detailedEcology)
  })

  it('parses human, awareness, internal, handoff, and rating DTOs', () => {
    expect(
      CompleteHumanSubtaskDtoSchema.parse({
        summary: 'Done',
        files: [
          {
            url: 'https://example.com/file.txt',
            name: 'file.txt',
            size: 123,
            mime_type: 'text/plain',
          },
        ],
        links: [{ url: 'https://example.com', label: 'Source' }],
      }),
    ).toMatchObject({ summary: 'Done' })

    expect(
      AwarenessAppendSubtasksDtoSchema.parse({
        mission_id: missionId,
        user_id: userId,
        org_id: orgId,
        awareness_session_id: '55555555-5555-4555-8555-555555555555',
        subtasks: [
          {
            id: 'next-step',
            title: 'Review checklist',
            assignTo: 'reviewer',
            intent: {
              why: 'Validate quality',
              story: 'Reviewer checks the output',
              sensory: 'Clear comments',
              endState: 'Checklist approved',
              ecology: 'No duplicate work',
            },
          },
        ],
      }),
    ).toMatchObject({ mission_id: missionId })

    expect(
      InternalCreateMissionDtoSchema.parse({
        user_id: userId,
        org_id: orgId,
        title: 'Internal mission',
        idempotency_key: 'internal-create-1',
      }),
    ).toMatchObject({ title: 'Internal mission' })

    expect(
      FireAgentDtoSchema.parse({
        handoff: { scope: 'agent', agent_key: 'operator' },
      }),
    ).toEqual({ handoff: { scope: 'agent', agent_key: 'operator' } })

    expect(
      RateMissionDtoSchema.parse({
        thumbs_up: true,
        feedback: 'Useful',
      }),
    ).toMatchObject({ thumbs_up: true })
    expect(RateMissionDtoSchema.safeParse({ feedback: 'missing score' }).success).toBe(false)
    expect(ExtendMissionDtoSchema.parse({ action: 'post-call-strategy' })).toEqual({
      action: 'post-call-strategy',
    })
    expect(ExtendMissionDtoSchema.safeParse({ action: 'webinar-fulfillment' }).success).toBe(false)
  })
})
