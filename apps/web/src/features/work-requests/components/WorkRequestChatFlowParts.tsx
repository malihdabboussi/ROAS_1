'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { WORK_REQUEST_MESSAGES } from '../config/messages.config'
import {
  getAnswerDisplay,
  type WorkRequestChatAnswers,
  type WorkRequestChatStep,
} from '../lib/work-request-chat-steps'

export type WorkRequestChatTranscriptRole = 'assistant' | 'user' | 'system'

export function WorkRequestChatBubble({
  role,
  text,
}: {
  role: WorkRequestChatTranscriptRole
  text: string
}) {
  if (role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="bg-primary/15 text-foreground rounded-spacing-3 body-3 px-spacing-3 py-spacing-2 max-w-[85%]">
          {text}
        </div>
      </div>
    )
  }
  return (
    <div className="flex justify-start">
      <div className="surface-card border-border text-foreground rounded-spacing-3 body-3 px-spacing-3 py-spacing-2 max-w-[90%] border">
        {text}
      </div>
    </div>
  )
}

export function WorkRequestChatStepCard({
  step,
  stepIndex,
  totalSteps,
  value,
  busy,
  onChoice,
  onContinue,
  onSkip,
}: {
  step: WorkRequestChatStep
  stepIndex: number
  totalSteps: number
  value: string
  busy: boolean
  onChoice: (value: string) => void
  onContinue: (value: string) => void
  onSkip: () => void
}) {
  const [draftValue, setDraftValue] = useState(value)
  useEffect(() => setDraftValue(value), [step.id, value])

  return (
    <div className="surface-card border-border rounded-spacing-3 space-y-spacing-3 p-spacing-3 border">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="body-2 text-foreground font-medium">
            {step.prompt}
            {step.required ? <span className="text-destructive ml-1">*</span> : null}
          </p>
          {step.hint ? <p className="body-3 text-muted-foreground">{step.hint}</p> : null}
        </div>
        <span className="body-3 text-muted-foreground shrink-0">
          {stepIndex + 1}/{totalSteps}
        </span>
      </div>

      {step.kind === 'single_choice' && step.options ? (
        <div className="surface-card card-glass rounded-spacing-2 overflow-hidden">
          {step.options.map((option, index) => {
            const selected = value === option.id
            return (
              <button
                key={`${option.id || 'general'}-${index}`}
                type="button"
                disabled={busy}
                onClick={() => onChoice(option.id)}
                className={`px-spacing-3 py-spacing-3 w-full text-left transition-all ${
                  index < step.options!.length - 1 ? 'border-border border-b' : ''
                } ${selected ? 'bg-primary/10' : 'hover:bg-hover-subtle'} ${
                  busy ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="body-2 font-medium">{option.label}</span>
                  <span
                    className={`body-3 rounded-spacing-1 flex h-6 w-6 items-center justify-center ${
                      selected
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {index + 1}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      ) : (
        <>
          {step.kind === 'textarea' ? (
            <textarea
              value={draftValue}
              onChange={(event) => setDraftValue(event.target.value)}
              rows={5}
              disabled={busy}
              className="body-3 rounded-spacing-2 border-border bg-background px-spacing-3 py-spacing-2 focus:ring-ring w-full resize-y border outline-none focus:ring-2"
            />
          ) : (
            <input
              type={step.kind === 'date' ? 'date' : 'text'}
              value={draftValue}
              onChange={(event) => setDraftValue(event.target.value)}
              disabled={busy}
              className="body-3 rounded-spacing-2 border-border bg-background h-spacing-9 px-spacing-3 focus:ring-ring w-full border outline-none focus:ring-2"
            />
          )}
          <div className="flex items-center justify-between gap-2">
            <div>
              {!step.required && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={onSkip}
                  className="button-glass-neutral rounded-spacing-2 body-3 px-spacing-3 py-spacing-2"
                >
                  Skip
                </button>
              )}
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => onContinue(draftValue)}
              className="button-glass-accent rounded-spacing-2 body-3 px-spacing-4 py-spacing-2 font-medium"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export function WorkRequestChatConfirmCard({
  steps,
  answers,
  busy,
  onBack,
  onSubmit,
}: {
  steps: WorkRequestChatStep[]
  answers: WorkRequestChatAnswers
  busy: 'save' | 'submit' | null
  onBack: () => void
  onSubmit: () => void
}) {
  return (
    <div className="surface-card border-border rounded-spacing-3 space-y-spacing-3 p-spacing-3 border">
      <div>
        <p className="body-2 font-medium">Ready to submit this Service Request?</p>
        <p className="body-3 text-muted-foreground mt-1">
          Review the answers below, then submit. You can still reply in chat to change something.
        </p>
      </div>
      <div className="space-y-2">
        {steps.map((step) => (
          <div key={step.id} className="body-3 text-muted-foreground flex gap-2">
            <span className="text-foreground min-w-0 flex-1 truncate">{step.prompt}</span>
            <span className="text-success max-w-[50%] shrink-0 truncate font-medium">
              {getAnswerDisplay(step, answers)}
            </span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between gap-2">
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
