import type {
  PublicWorkRequestDraft,
  WorkRequestOptions,
  WorkRequestReviewResponse,
  WorkRequestUpdate,
} from '@/lib/work-requests'
import {
  buildWorkRequestChatSteps,
  draftToChatAnswers,
  listKnownSteps,
  listPendingSteps,
  type WorkRequestChatAnswers,
  type WorkRequestChatStep,
} from '../lib/work-request-chat-steps'

export type WorkRequestChatTranscriptItem =
  | { id: string; role: 'assistant'; text: string }
  | { id: string; role: 'user'; text: string }
  | { id: string; role: 'system'; text: string }

export type WorkRequestChatFinalizedReceipt = {
  sync_status?: string
  task_url?: string | null
  clickup_url?: string | null
}

export type WorkRequestChatFlowProps = {
  draft: PublicWorkRequestDraft
  options: WorkRequestOptions
  presentation?: 'page' | 'inline'
  onSave: (update: WorkRequestUpdate) => Promise<WorkRequestReviewResponse>
  onSubmit: (update: WorkRequestUpdate) => Promise<WorkRequestReviewResponse>
}

export function buildWorkRequestChatIntro(knownCount: number, gapCount: number): string {
  if (knownCount === 0) {
    return 'Let’s finish this Service Request — one step at a time. Tap a card or reply below.'
  }
  if (gapCount === 0) {
    return 'I already have everything for this request. Review the details, edit anything that’s off, then submit.'
  }
  return `I already have ${knownCount} detail${knownCount === 1 ? '' : 's'} on this request. Edit anything that’s wrong — then we’ll cover what’s still missing.`
}

export function buildWorkRequestChatSeedTranscript(
  draft: PublicWorkRequestDraft,
  options: WorkRequestOptions,
): WorkRequestChatTranscriptItem[] {
  const seedAnswers = draftToChatAnswers(draft)
  const seedSteps = buildWorkRequestChatSteps(draft, options, seedAnswers)
  return [
    {
      id: 'intro',
      role: 'assistant',
      text: buildWorkRequestChatIntro(
        listKnownSteps(seedSteps, seedAnswers).length,
        listPendingSteps(seedSteps, seedAnswers).filter((step) => step.kind !== 'confirm').length,
      ),
    },
  ]
}

export function readWorkRequestChatStepValue(
  step: WorkRequestChatStep,
  answers: WorkRequestChatAnswers,
): string {
  if (typeof step.field === 'string' && step.field.startsWith('structured:')) {
    return answers.structured_fields[step.field.slice('structured:'.length)] ?? ''
  }
  if (step.field === 'confirm') return ''
  return String(answers[step.field as keyof WorkRequestChatAnswers] ?? '')
}
