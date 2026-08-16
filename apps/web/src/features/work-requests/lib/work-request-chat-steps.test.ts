import { describe, expect, it } from 'vitest'
import type { PublicWorkRequestDraft, WorkRequestOptions } from '@/lib/work-requests'
import {
  answersToUpdate,
  applyStepAnswer,
  buildWorkRequestChatSteps,
  draftToChatAnswers,
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
}

describe('work-request-chat-steps', () => {
  it('builds one-at-a-time steps ending in confirm', () => {
    const answers = draftToChatAnswers(draft)
    const steps = buildWorkRequestChatSteps(draft, options, answers)
    expect(steps[0]?.id).toBe('client_workspace_id')
    expect(steps.at(-1)?.kind).toBe('confirm')
    expect(steps.some((step) => step.kind === 'single_choice')).toBe(true)
    expect(
      steps.find((step) => step.id === 'campaign_space_id')?.options?.map((o) => o.label),
    ).toEqual(['General client work', 'Launch'])
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
