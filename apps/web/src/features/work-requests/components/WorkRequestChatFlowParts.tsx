'use client'

import { useEffect, useState } from 'react'
import { SettingsDropdown } from '@/components/ui/forms/SettingsDropdown'
import { WORK_REQUEST_MESSAGES } from '../config/messages.config'
import { type WorkRequestChatStep } from '../lib/work-request-chat-steps'
import { WorkRequestAssetsStep, WorkRequestDateStep } from './WorkRequestChatFlowInputs'

export type WorkRequestChatTranscriptRole = 'assistant' | 'user' | 'system'

export const WORK_REQUEST_OTHER_CHOICE_ID = '__other__'

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

function StepActions({
  required,
  busy,
  continueDisabled,
  onBack,
  onSkip,
  onContinue,
}: {
  required: boolean
  busy: boolean
  continueDisabled?: boolean
  onBack?: () => void
  onSkip: () => void
  onContinue: () => void
}) {
  return (
    <div className="gap-spacing-2 flex items-center justify-between">
      <div className="gap-spacing-2 flex items-center">
        {onBack ? (
          <button
            type="button"
            disabled={busy}
            onClick={onBack}
            className="button-glass-neutral rounded-spacing-2 body-3 px-spacing-3 py-spacing-2"
          >
            Back
          </button>
        ) : null}
        {!required && (
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
        disabled={busy || continueDisabled}
        onClick={onContinue}
        className="button-glass-accent rounded-spacing-2 body-3 px-spacing-4 py-spacing-2 font-medium disabled:opacity-50"
      >
        Continue
      </button>
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
  onBack,
}: {
  step: WorkRequestChatStep
  stepIndex: number
  totalSteps: number
  value: string
  busy: boolean
  onChoice: (value: string) => void
  onContinue: (value: string) => void
  onSkip: () => void
  onBack?: () => void
}) {
  const [draftValue, setDraftValue] = useState(value)
  const [otherText, setOtherText] = useState('')
  useEffect(() => {
    setDraftValue(value)
    setOtherText('')
  }, [step.id, value])

  const searchableChoice = step.kind === 'single_choice' && Boolean(step.searchable && step.options)
  const allowOther = Boolean(step.allowOther)
  const otherSelected = allowOther && draftValue === WORK_REQUEST_OTHER_CHOICE_ID
  const choiceOptions = step.options ?? []

  const commitChoice = () => {
    if (otherSelected) {
      onChoice(otherText.trim())
      return
    }
    onChoice(draftValue)
  }

  const choiceReady = otherSelected
    ? otherText.trim().length > 0
    : choiceOptions.some((option) => option.id === draftValue)

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

      {searchableChoice && step.options ? (
        <>
          <SettingsDropdown
            value={otherSelected ? WORK_REQUEST_OTHER_CHOICE_ID : draftValue}
            options={[
              ...step.options.map((option) => ({
                value: option.id,
                label: option.label,
                description: option.description,
              })),
              ...(allowOther ? [{ value: WORK_REQUEST_OTHER_CHOICE_ID, label: 'Other…' }] : []),
            ]}
            onChange={setDraftValue}
            placeholder="Search and select…"
            searchable
            disabled={busy}
            appearance="spaces"
          />
          {otherSelected ? (
            <input
              type="text"
              value={otherText}
              onChange={(event) => setOtherText(event.target.value)}
              disabled={busy}
              placeholder={WORK_REQUEST_MESSAGES.assigneeOtherPlaceholder}
              className="body-3 rounded-spacing-2 border-border bg-background h-spacing-9 px-spacing-3 focus:ring-ring w-full border outline-none focus:ring-2"
            />
          ) : null}
          <StepActions
            required={step.required}
            busy={busy}
            continueDisabled={!choiceReady}
            onBack={onBack}
            onSkip={onSkip}
            onContinue={commitChoice}
          />
        </>
      ) : step.kind === 'single_choice' && step.options ? (
        <>
          <div className="surface-card card-glass rounded-spacing-2 overflow-hidden">
            {choiceOptions.map((option, index) => {
              const selected = draftValue === option.id
              return (
                <button
                  key={`${option.id || 'general'}-${index}`}
                  type="button"
                  disabled={busy}
                  onClick={() => setDraftValue(option.id)}
                  className={`px-spacing-3 py-spacing-3 w-full text-left transition-all ${
                    index < choiceOptions.length - 1 || allowOther ? 'border-border border-b' : ''
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
            {allowOther ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => setDraftValue(WORK_REQUEST_OTHER_CHOICE_ID)}
                className={`px-spacing-3 py-spacing-3 w-full text-left transition-all ${
                  otherSelected ? 'bg-primary/10' : 'hover:bg-hover-subtle'
                } ${busy ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="body-2 font-medium">Other…</span>
                  <span
                    className={`body-3 rounded-spacing-1 flex h-6 w-6 items-center justify-center ${
                      otherSelected
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {choiceOptions.length + 1}
                  </span>
                </div>
              </button>
            ) : null}
          </div>
          {otherSelected ? (
            <input
              type="text"
              value={otherText}
              onChange={(event) => setOtherText(event.target.value)}
              disabled={busy}
              placeholder="Type your answer"
              className="body-3 rounded-spacing-2 border-border bg-background h-spacing-9 px-spacing-3 focus:ring-ring w-full border outline-none focus:ring-2"
            />
          ) : null}
          <StepActions
            required={step.required}
            busy={busy}
            continueDisabled={!choiceReady}
            onBack={onBack}
            onSkip={onSkip}
            onContinue={commitChoice}
          />
        </>
      ) : step.kind === 'date' ? (
        <WorkRequestDateStep
          value={value}
          busy={busy}
          required={step.required}
          onContinue={onContinue}
          onSkip={onSkip}
          onBack={onBack}
        />
      ) : step.kind === 'assets' ? (
        <WorkRequestAssetsStep
          value={value}
          busy={busy}
          required={step.required}
          onContinue={onContinue}
          onSkip={onSkip}
          onBack={onBack}
        />
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
              type="text"
              value={draftValue}
              onChange={(event) => setDraftValue(event.target.value)}
              disabled={busy}
              className="body-3 rounded-spacing-2 border-border bg-background h-spacing-9 px-spacing-3 focus:ring-ring w-full border outline-none focus:ring-2"
            />
          )}
          <StepActions
            required={step.required}
            busy={busy}
            continueDisabled={step.required && !draftValue.trim()}
            onBack={onBack}
            onSkip={onSkip}
            onContinue={() => onContinue(draftValue)}
          />
        </>
      )}
    </div>
  )
}
