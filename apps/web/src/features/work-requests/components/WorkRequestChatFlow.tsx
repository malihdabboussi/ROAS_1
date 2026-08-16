'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, MessageCircle } from 'lucide-react'
import type {
  PublicWorkRequestDraft,
  WorkRequestOptions,
  WorkRequestReviewResponse,
  WorkRequestUpdate,
} from '@/lib/work-requests'
import { WORK_REQUEST_ERRORS } from '../config/errors.config'
import { WORK_REQUEST_MESSAGES } from '../config/messages.config'
import {
  answersToUpdate,
  applyStepAnswer,
  buildWorkRequestChatSteps,
  draftToChatAnswers,
  resolveChoiceFromChat,
  type WorkRequestChatAnswers,
  type WorkRequestChatStep,
} from '../lib/work-request-chat-steps'
import {
  WorkRequestChatBubble,
  WorkRequestChatConfirmCard,
  WorkRequestChatStepCard,
} from './WorkRequestChatFlowParts'

type TranscriptItem =
  | { id: string; role: 'assistant'; text: string }
  | { id: string; role: 'user'; text: string }
  | { id: string; role: 'system'; text: string }

type FinalizedReceipt = {
  sync_status?: string
  task_url?: string | null
  clickup_url?: string | null
}

type Props = {
  draft: PublicWorkRequestDraft
  options: WorkRequestOptions
  onSave: (update: WorkRequestUpdate) => Promise<WorkRequestReviewResponse>
  onSubmit: (update: WorkRequestUpdate) => Promise<WorkRequestReviewResponse>
}

export function WorkRequestChatFlow({ draft, options, onSave, onSubmit }: Props) {
  const [answers, setAnswers] = useState<WorkRequestChatAnswers>(() => draftToChatAnswers(draft))
  const [stepIndex, setStepIndex] = useState(0)
  const [composer, setComposer] = useState('')
  const [busy, setBusy] = useState<'save' | 'submit' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [finalized, setFinalized] = useState<FinalizedReceipt | null>(null)
  const [transcript, setTranscript] = useState<TranscriptItem[]>(() => [
    {
      id: 'intro',
      role: 'assistant',
      text: 'Let’s finish this Service Request in chat — one step at a time. You can tap a card or type a reply below.',
    },
  ])
  const scrollerRef = useRef<HTMLDivElement>(null)
  const draftIdRef = useRef(draft.id)

  const steps = useMemo(
    () => buildWorkRequestChatSteps(draft, options, answers),
    [answers, draft, options],
  )
  const currentStep = steps[Math.min(stepIndex, steps.length - 1)] as
    | WorkRequestChatStep
    | undefined
  const isConfirm = currentStep?.kind === 'confirm'

  useEffect(() => {
    if (draftIdRef.current === draft.id) return
    draftIdRef.current = draft.id
    setAnswers(draftToChatAnswers(draft))
    setStepIndex(0)
    setFinalized(null)
    setError(null)
    setTranscript([
      {
        id: `intro-${draft.id}`,
        role: 'assistant',
        text: 'Let’s finish this Service Request in chat — one step at a time. You can tap a card or type a reply below.',
      },
    ])
  }, [draft])

  useEffect(() => {
    const node = scrollerRef.current
    if (!node || typeof node.scrollTo !== 'function') return
    node.scrollTo({ top: node.scrollHeight, behavior: 'smooth' })
  }, [transcript, stepIndex, finalized, error])

  const pushUser = (text: string) => {
    setTranscript((items) => [...items, { id: `u-${Date.now()}`, role: 'user', text }])
  }

  const pushAssistant = (text: string) => {
    setTranscript((items) => [...items, { id: `a-${Date.now()}`, role: 'assistant', text }])
  }

  const advance = (nextAnswers: WorkRequestChatAnswers, label: string) => {
    pushUser(label)
    const nextSteps = buildWorkRequestChatSteps(draft, options, nextAnswers)
    const nextIndex = Math.min(stepIndex + 1, nextSteps.length - 1)
    setAnswers(nextAnswers)
    setStepIndex(nextIndex)
    const next = nextSteps[nextIndex]
    if (next && next.id !== currentStep?.id) {
      pushAssistant(next.prompt)
    }
  }

  const commitChoice = (value: string) => {
    if (!currentStep || currentStep.kind !== 'single_choice') return
    const next = applyStepAnswer(answers, currentStep, value)
    const label =
      currentStep.options?.find((option) => option.id === value)?.label ??
      (value || 'General client work')
    advance(next, label)
  }

  const commitText = (value: string, skipped = false) => {
    if (!currentStep || currentStep.kind === 'confirm' || currentStep.kind === 'single_choice')
      return
    if (currentStep.required && !value.trim()) {
      setError('Please answer this step to continue')
      return
    }
    const next = applyStepAnswer(answers, currentStep, value)
    advance(next, skipped ? 'Skipped' : value.trim() || 'Skipped')
  }

  const handleComposer = () => {
    const text = composer.trim()
    if (!text || !currentStep || busy || finalized) return
    setComposer('')
    setError(null)

    if (currentStep.kind === 'confirm') {
      pushUser(text)
      pushAssistant(
        'Got it. Use Submit when the summary looks right, or say which field to change (for example: “change title”).',
      )
      return
    }

    if (currentStep.kind === 'single_choice') {
      const matched = resolveChoiceFromChat(currentStep, text)
      if (matched === null && text.toLocaleLowerCase() !== 'skip') {
        pushUser(text)
        pushAssistant('Pick one of the options on the card, or type the option name exactly.')
        return
      }
      if (text.toLocaleLowerCase() === 'skip' && !currentStep.required) {
        commitChoice(
          currentStep.options?.[0]?.id === '' ? '' : (currentStep.options?.[0]?.id ?? ''),
        )
        return
      }
      if (matched !== null) commitChoice(matched)
      return
    }

    if (text.toLocaleLowerCase() === 'skip' && !currentStep.required) {
      commitText('', true)
      return
    }

    commitText(text)
  }

  const saveDraft = async () => {
    setBusy('save')
    setError(null)
    try {
      await onSave(answersToUpdate(answers))
      pushAssistant(WORK_REQUEST_MESSAGES.saved)
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : WORK_REQUEST_ERRORS.SAVE_FAILED.userMessage,
      )
    } finally {
      setBusy(null)
    }
  }

  const submitRequest = async () => {
    setBusy('submit')
    setError(null)
    try {
      const result = await onSubmit(answersToUpdate(answers))
      if (result.state === 'finalized') {
        setFinalized({
          sync_status: result.sync_status,
          task_url: result.task_url,
          clickup_url: result.clickup_url,
        })
        pushAssistant(
          result.sync_status === 'synced'
            ? `${WORK_REQUEST_MESSAGES.finalizedBody} The ClickUp mirror is confirmed.`
            : WORK_REQUEST_MESSAGES.mirrorPending,
        )
      }
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : WORK_REQUEST_ERRORS.FINALIZE_FAILED.userMessage,
      )
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="border-border bg-background rounded-spacing-4 flex h-[min(78dvh,720px)] flex-col overflow-hidden border">
      <header className="border-border gap-spacing-2 px-spacing-4 py-spacing-3 flex items-center border-b">
        <MessageCircle className="icon-sm text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="typo-caption text-muted-foreground">SERVICE REQUEST CHAT</p>
          <p className="body-3 text-foreground truncate font-medium">
            {draft.title || 'Untitled request'}
          </p>
        </div>
        {!finalized && (
          <button
            type="button"
            className="button-glass-neutral rounded-spacing-2 body-3 px-spacing-3 py-spacing-1"
            disabled={busy !== null}
            onClick={() => void saveDraft()}
          >
            {busy === 'save' ? WORK_REQUEST_MESSAGES.saving : 'Save draft'}
          </button>
        )}
      </header>

      <div
        ref={scrollerRef}
        className="gap-spacing-3 px-spacing-4 py-spacing-4 flex-1 space-y-3 overflow-y-auto"
      >
        {transcript.map((item) => (
          <WorkRequestChatBubble key={item.id} role={item.role} text={item.text} />
        ))}

        {!finalized && currentStep && currentStep.kind !== 'confirm' && (
          <WorkRequestChatStepCard
            step={currentStep}
            stepIndex={stepIndex}
            totalSteps={steps.length}
            value={
              typeof currentStep.field === 'string' && currentStep.field.startsWith('structured:')
                ? (answers.structured_fields[currentStep.field.slice('structured:'.length)] ?? '')
                : currentStep.field === 'confirm'
                  ? ''
                  : String(answers[currentStep.field as keyof WorkRequestChatAnswers] ?? '')
            }
            busy={busy !== null}
            onChoice={commitChoice}
            onContinue={(value) => commitText(value)}
            onSkip={() => commitText('', true)}
          />
        )}

        {!finalized && isConfirm && (
          <WorkRequestChatConfirmCard
            steps={steps.filter((step) => step.kind !== 'confirm')}
            answers={answers}
            busy={busy}
            onBack={() => setStepIndex((index) => Math.max(0, index - 1))}
            onSubmit={() => void submitRequest()}
          />
        )}

        {finalized && (
          <div className="surface-card border-success rounded-spacing-3 space-y-spacing-3 p-spacing-4 border">
            <div className="gap-spacing-2 flex items-center">
              <Check className="icon-sm text-success" />
              <span className="body-2 font-medium">{WORK_REQUEST_MESSAGES.finalizedTitle}</span>
            </div>
            <p className="body-3 text-muted-foreground">
              {finalized.sync_status === 'synced'
                ? `${WORK_REQUEST_MESSAGES.finalizedBody} The ClickUp mirror is confirmed.`
                : WORK_REQUEST_MESSAGES.mirrorPending}
            </p>
            <div className="gap-spacing-2 flex flex-wrap">
              {finalized.task_url ? (
                <a href={finalized.task_url} className="button-default button-glass-primary">
                  Open ROAS task
                </a>
              ) : null}
              {finalized.clickup_url ? (
                <a
                  href={finalized.clickup_url}
                  target="_blank"
                  rel="noreferrer"
                  className="button-default button-glass-neutral"
                >
                  Open ClickUp task
                </a>
              ) : null}
            </div>
          </div>
        )}

        {error && (
          <p className="bg-destructive/10 border-destructive text-destructive rounded-spacing-2 p-spacing-3 body-3 border">
            {error}
          </p>
        )}
      </div>

      {!finalized && (
        <form
          className="border-border gap-spacing-2 px-spacing-4 py-spacing-3 flex items-end border-t"
          onSubmit={(event) => {
            event.preventDefault()
            handleComposer()
          }}
        >
          <textarea
            value={composer}
            onChange={(event) => setComposer(event.target.value)}
            rows={1}
            placeholder="Reply in chat…"
            disabled={busy !== null}
            className="body-3 rounded-spacing-2 border-border bg-background px-spacing-3 py-spacing-2 focus:ring-ring max-h-28 min-h-[40px] w-full resize-y border outline-none focus:ring-2"
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                handleComposer()
              }
            }}
          />
          <button
            type="submit"
            className="button-glass-accent rounded-spacing-2 body-3 px-spacing-4 py-spacing-2 shrink-0 font-medium disabled:opacity-50"
            disabled={busy !== null || !composer.trim()}
          >
            Send
          </button>
        </form>
      )}
    </div>
  )
}
