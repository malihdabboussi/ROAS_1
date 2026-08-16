import { describe, expect, it } from 'vitest'
import type { PublicWorkRequestDraft, WorkRequestOptions } from '@/lib/work-requests'
import {
  answersToUpdate,
  applyStepAnswer,
  buildWorkRequestChatSteps,
  draftToChatAnswers,
  isStepSatisfied,
  listKnownSteps,
  listPendingSteps,
  resolveChoiceFromChat,
} from './work-request-chat-steps'

const draft: PublicWorkRequestDraft = {
  id: 'draft-1',
  client_workspace_id: 'ws-1',
  campaign_space_id: null,
  request_type: 'general',
  assignee_name: null,
  title: 'Production review smoke test',
  description: 'Controlled smoke test',
  due_date: '2026-08-22',
  priority: 'medium',
  structured_fields: {},
  links: ['https://example.com/production-smoke'],
  required_fields: ['title', 'description'],
  missing_fields: [],
  assets: [],
  dependencies: [],
  requester: { name: 'Dylan' },
  status: 'draft',
  expires_at: '2026-08-17T00:00:00.000Z',
  final_task_id: null,
  sync_status: 'not_started',
  resume_conversation_id: null,
  task_url: null,
  clickup_url: null,
}

const options: WorkRequestOptions = {
  client_workspaces: [
    { id: 'ws-1', name: 'Test webinar - campaign creation' },
    { id: 'ws-2', name: 'Other client' },
  ],
  campaign_spaces: [
    { id: 'space-1', name: 'Launch', client_workspace_id: 'ws-1' },
    { id: 'space-2', name: 'Other space', client_workspace_id: 'ws-2' },
  ],
  team_members: [
    { id: 'u-1', name: 'Sam Editor' },
    { id: 'u-2', name: 'Alex Producer' },
  ],
}

describe('work-request-chat-steps', () => {
  it('builds one-at-a-time steps ending in confirm', () => {
    const answers = draftToChatAnswers(draft)
    const steps = buildWorkRequestChatSteps(draft, options, answers)
    expect(steps[0]?.id).toBe('client_workspace_id')
    expect(steps.at(-1)?.kind).toBe('confirm')
    expect(steps.some((step) => step.kind === 'single_choice')).toBe(true)
    expect(steps.find((step) => step.id === 'client_workspace_id')?.searchable).toBe(true)
    expect(
      steps.find((step) => step.id === 'campaign_space_id')?.options?.map((o) => o.label),
    ).toEqual(['General client work', 'Launch'])
  })

  it('treats prefilled draft fields as known and only queues gaps', () => {
    const answers = draftToChatAnswers(draft)
    const steps = buildWorkRequestChatSteps(draft, options, answers)
    const known = listKnownSteps(steps, answers)
    const pending = listPendingSteps(steps, answers)

    expect(known.map((step) => step.id)).toEqual(
      expect.arrayContaining([
        'client_workspace_id',
        'request_type',
        'priority',
        'title',
        'description',
        'due_date',
        'links',
      ]),
    )
    expect(known.some((step) => step.id === 'campaign_space_id')).toBe(false)
    expect(isStepSatisfied(steps.find((step) => step.id === 'campaign_space_id')!, answers)).toBe(
      false,
    )
    expect(pending.map((step) => step.id)).toEqual([
      'campaign_space_id',
      'assignee_name',
      'assets',
      'confirm',
    ])
    expect(steps.find((step) => step.id === 'assignee_name')?.kind).toBe('single_choice')
    expect(steps.find((step) => step.id === 'assets')?.kind).toBe('assets')
    expect(steps.some((step) => step.id === 'dependencies')).toBe(false)
  })

  it('maps assignee unassigned choice to an empty name', () => {
    let answers = draftToChatAnswers(draft)
    const steps = buildWorkRequestChatSteps(draft, options, answers)
    const assigneeStep = steps.find((step) => step.id === 'assignee_name')!
    answers = applyStepAnswer(answers, assigneeStep, '__unassigned__')
    expect(answers.assignee_name).toBe('')
    expect(answersToUpdate(answers).assignee_name).toBeNull()
  })

  it('resolves free-text choice replies by label', () => {
    const answers = draftToChatAnswers(draft)
    const steps = buildWorkRequestChatSteps(draft, options, answers)
    const workspaceStep = steps.find((step) => step.id === 'client_workspace_id')!
    expect(resolveChoiceFromChat(workspaceStep, 'Other client')).toBe('ws-2')
    expect(resolveChoiceFromChat(workspaceStep, 'nope')).toBeNull()
  })

  it('maps answers into a draft update payload', () => {
    let answers = draftToChatAnswers(draft)
    const steps = buildWorkRequestChatSteps(draft, options, answers)
    const typeStep = steps.find((step) => step.id === 'request_type')!
    answers = applyStepAnswer(answers, typeStep, 'funnel')
    const update = answersToUpdate(answers)
    expect(update.request_type).toBe('funnel')
    expect(update.links).toEqual(['https://example.com/production-smoke'])
    expect(update.campaign_space_id).toBeNull()
  })
})
