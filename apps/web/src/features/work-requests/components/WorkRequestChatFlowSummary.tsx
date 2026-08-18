'use client'

import { Loader2 } from 'lucide-react'
import { WORK_REQUEST_MESSAGES } from '../config/messages.config'
import {
  getAnswerDisplay,
  type WorkRequestChatAnswers,
  type WorkRequestChatStep,
} from '../lib/work-request-chat-steps'

export function WorkRequestChatConfirmCard({
  steps,
  answers,
  busy,
  onBack,
  onSubmit,
  onEdit,
}: {
  steps: WorkRequestChatStep[]
  answers: WorkRequestChatAnswers
  busy: 'save' | 'submit' | null
  onBack: () => void
  onSubmit: () => void
  onEdit?: (stepId: string) => void
}) {
  return (
    <div className="surface-card border-border rounded-spacing-3 space-y-spacing-3 p-spacing-3 border">
      <div>
        <p className="body-2 font-medium">Ready to submit this Service Request?</p>
        <p className="body-3 text-muted-foreground mt-spacing-1">
          Review the answers below, then submit. Tap Edit to change anything.
        </p>
      </div>
      <div className="space-y-spacing-2">
        {steps.map((step) => (
          <div
            key={step.id}
            className="body-3 text-muted-foreground gap-spacing-2 flex items-center"
          >
            <span className="text-foreground min-w-0 flex-1 truncate">{step.prompt}</span>
            <span className="text-success max-w-[40%] shrink-0 truncate font-medium">
              {getAnswerDisplay(step, answers)}
            </span>
            {onEdit ? (
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => onEdit(step.id)}
                className="button-glass-neutral rounded-spacing-2 body-4 px-spacing-2 py-spacing-1 shrink-0"
              >
                Edit
              </button>
            ) : null}
          </div>
        ))}
      </div>
      <div className="gap-spacing-2 flex items-center justify-between">
        <button
          type="button"
          disabled={busy !== null}
          onClick={onBack}
          className="button-glass-neutral rounded-spacing-2 body-3 px-spacing-3 py-spacing-2"
        >
          Back
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={onSubmit}
          className="button-glass-accent rounded-spacing-2 body-3 gap-spacing-1 px-spacing-4 py-spacing-2 flex items-center font-medium"
        >
          {busy === 'submit' && <Loader2 className="icon-xs animate-spin" />}
          {busy === 'submit' ? WORK_REQUEST_MESSAGES.submitting : 'Submit request'}
        </button>
      </div>
    </div>
  )
}

/** Shows values already on the draft with Edit → same step cards. */
export function WorkRequestKnownAnswersCard({
  steps,
  answers,
  busy,
  onEdit,
}: {
  steps: WorkRequestChatStep[]
  answers: WorkRequestChatAnswers
  busy: boolean
  onEdit: (stepId: string) => void
}) {
  if (steps.length === 0) return null
  return (
    <div className="surface-card border-border rounded-spacing-3 space-y-spacing-3 p-spacing-3 border">
      <div>
        <p className="body-2 font-medium">Already on this request</p>
        <p className="body-3 text-muted-foreground mt-spacing-1">
          Edit anything that’s wrong. We’ll only ask for what’s still missing.
        </p>
      </div>
      <div className="space-y-spacing-2">
        {steps.map((step) => (
          <div key={step.id} className="gap-spacing-2 flex items-center">
            <div className="min-w-0 flex-1">
              <p className="body-3 text-muted-foreground truncate">{step.prompt}</p>
              <p className="body-2 text-foreground truncate font-medium">
                {getAnswerDisplay(step, answers)}
              </p>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => onEdit(step.id)}
              className="button-glass-neutral rounded-spacing-2 body-3 px-spacing-3 py-spacing-1 shrink-0"
            >
              Edit
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
