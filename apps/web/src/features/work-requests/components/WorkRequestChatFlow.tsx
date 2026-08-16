'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check } from 'lucide-react'
import { WORK_REQUEST_ERRORS } from '../config/errors.config'
import { WORK_REQUEST_MESSAGES } from '../config/messages.config'
import {
  answersToUpdate,
  applyStepAnswer,
  buildWorkRequestChatSteps,
  draftToChatAnswers,
  listKnownSteps,
  listPendingSteps,
  resolveChoiceFromChat,
  type WorkRequestChatAnswers,
  type WorkRequestChatStep,
} from '../lib/work-request-chat-steps'
import {
  buildWorkRequestChatIntro,
  buildWorkRequestChatSeedTranscript,
  readWorkRequestChatStepValue,
  type WorkRequestChatFinalizedReceipt,
  type WorkRequestChatFlowProps,
  type WorkRequestChatTranscriptItem,
} from './WorkRequestChatFlowHelpers'
import {
  WorkRequestChatBubble,
  WorkRequestChatConfirmCard,
  WorkRequestChatStepCard,
  WorkRequestKnownAnswersCard,
} from './WorkRequestChatFlowParts'

export function WorkRequestChatFlow({
  draft,
  options,
  presentation = 'page',
  onSave,
  onSubmit,
}: WorkRequestChatFlowProps) {
  const [answers, setAnswers] = useState<WorkRequestChatAnswers>(() => draftToChatAnswers(draft))
  const [stepIndex, setStepIndex] = useState(0)
  const [editingStepId, setEditingStepId] = useState<string | null>(null)
  const [composer, setComposer] = useState('')
  const [busy, setBusy] = useState<'save' | 'submit' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [finalized, setFinalized] = useState<WorkRequestChatFinalizedReceipt | null>(null)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const draftIdRef = useRef(draft.id)
  const isPage = presentation === 'page'

  const allSteps = useMemo(
    () => buildWorkRequestChatSteps(draft, options, answers),
    [answers, draft, options],
  )
  const knownSteps = useMemo(() => listKnownSteps(allSteps, answers), [allSteps, answers])
  const pendingSteps = useMemo(() => listPendingSteps(allSteps, answers), [allSteps, answers])

  const [transcript, setTranscript] = useState<WorkRequestChatTranscriptItem[]>(() =>
    buildWorkRequestChatSeedTranscript(draft, options),
  )

  const currentStep = pendingSteps[Math.min(stepIndex, pendingSteps.length - 1)] as
    | WorkRequestChatStep
    | undefined
  const editingStep = editingStepId
    ? allSteps.find((step) => step.id === editingStepId && step.kind !== 'confirm')
    : undefined
  const activeStep = editingStep ?? currentStep
  const isConfirm = !editingStep && currentStep?.kind === 'confirm'

  useEffect(() => {
    if (draftIdRef.current === draft.id) return
    draftIdRef.current = draft.id
    const nextAnswers = draftToChatAnswers(draft)
    const nextAll = buildWorkRequestChatSteps(draft, options, nextAnswers)
    setAnswers(nextAnswers)
    setStepIndex(0)
    setEditingStepId(null)
    setFinalized(null)
    setError(null)
    setTranscript([
      {
        id: `intro-${draft.id}`,
        role: 'assistant',
        text: buildWorkRequestChatIntro(
          listKnownSteps(nextAll, nextAnswers).length,
          listPendingSteps(nextAll, nextAnswers).filter((step) => step.kind !== 'confirm').length,
        ),
      },
    ])
  }, [draft, options])

  useEffect(() => {
    if (stepIndex < pendingSteps.length) return
    setStepIndex(Math.max(0, pendingSteps.length - 1))
  }, [pendingSteps.length, stepIndex])

  useEffect(() => {
    const node = scrollerRef.current
    if (!node || typeof node.scrollTo !== 'function') return
    node.scrollTo({ top: node.scrollHeight, behavior: 'smooth' })
  }, [transcript, stepIndex, finalized, error, editingStepId])

  const pushUser = (text: string) => {
    setTranscript((items) => [...items, { id: `u-${Date.now()}`, role: 'user', text }])
  }

  const pushAssistant = (text: string) => {
    setTranscript((items) => [...items, { id: `a-${Date.now()}`, role: 'assistant', text }])
  }

  const advanceFromPending = (nextAnswers: WorkRequestChatAnswers, label: string) => {
    pushUser(label)
    const nextPending = listPendingSteps(
      buildWorkRequestChatSteps(draft, options, nextAnswers),
      nextAnswers,
    )
    const nextIndex = Math.min(stepIndex + 1, nextPending.length - 1)
    setAnswers(nextAnswers)
    setStepIndex(Math.max(0, nextIndex))
    setEditingStepId(null)
    const next = nextPending[nextIndex]
    if (next && next.id !== currentStep?.id) {
      pushAssistant(next.kind === 'confirm' ? next.prompt : next.prompt)
    }
  }

  const commitEdit = (nextAnswers: WorkRequestChatAnswers, label: string) => {
    pushUser(label)
    setAnswers(nextAnswers)
    setEditingStepId(null)
    pushAssistant('Updated. Continue with what’s left, or edit another detail above.')
  }

  const commitChoice = (value: string) => {
    if (!activeStep || activeStep.kind !== 'single_choice') return
    const next = applyStepAnswer(answers, activeStep, value)
    const label =
      activeStep.options?.find((option) => option.id === value)?.label ??
      (value || 'General client work')
    if (editingStep) {
      commitEdit(next, label)
      return
    }
    advanceFromPending(next, label)
  }

  const commitText = (value: string, skipped = false) => {
    if (!activeStep || activeStep.kind === 'confirm' || activeStep.kind === 'single_choice') return
    if (activeStep.required && !value.trim()) {
      setError('Please answer this step to continue')
      return
    }
    const next = applyStepAnswer(answers, activeStep, value)
    const label = skipped ? 'Skipped' : value.trim() || 'Skipped'
    if (editingStep) {
      commitEdit(next, label)
      return
    }
    advanceFromPending(next, label)
  }

  const handleComposer = () => {
    const text = composer.trim()
    if (!text || !activeStep || busy || finalized) return
    setComposer('')
    setError(null)

    if (activeStep.kind === 'confirm') {
      pushUser(text)
      pushAssistant('Got it. Use Submit when the summary looks right, or tap Edit on a field.')
      return
    }

    if (activeStep.kind === 'single_choice') {
      const matched = resolveChoiceFromChat(activeStep, text)
      if (matched === null && text.toLocaleLowerCase() !== 'skip') {
        pushUser(text)
        pushAssistant('Pick one of the options on the card, or type the option name exactly.')
        return
      }
      if (text.toLocaleLowerCase() === 'skip' && !activeStep.required) {
        const skipId =
          activeStep.options?.find((option) => option.id === '__unassigned__' || option.id === '')
            ?.id ??
          activeStep.options?.[0]?.id ??
          ''
        commitChoice(skipId)
        return
      }
      if (matched !== null) commitChoice(matched)
      return
    }

    if (text.toLocaleLowerCase() === 'skip' && !activeStep.required) {
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
    <div
      className={`bg-background flex flex-col overflow-hidden ${
        isPage
          ? 'min-h-dvh'
          : 'border-border rounded-spacing-3 mt-spacing-3 max-h-[min(70dvh,640px)] border'
      }`}
    >
      <header className="border-border gap-spacing-2 px-spacing-4 py-spacing-3 flex items-center border-b">
        <div className="min-w-0 flex-1">
          <p className="body-2 text-foreground truncate font-medium">
            {draft.title || 'Service Request'}
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
        className="gap-spacing-3 px-spacing-4 py-spacing-4 space-y-spacing-3 flex-1 overflow-y-auto"
      >
        {transcript.map((item) => (
          <WorkRequestChatBubble key={item.id} role={item.role} text={item.text} />
        ))}

        {!finalized && knownSteps.length > 0 && !editingStep && (
          <WorkRequestKnownAnswersCard
            steps={knownSteps}
            answers={answers}
            busy={busy !== null}
            onEdit={setEditingStepId}
          />
        )}

        {!finalized && activeStep && activeStep.kind !== 'confirm' && (
          <WorkRequestChatStepCard
            step={activeStep}
            stepIndex={
              editingStep
                ? Math.max(
                    0,
                    allSteps.findIndex((step) => step.id === activeStep.id),
                  )
                : stepIndex
            }
            totalSteps={
              editingStep
                ? allSteps.filter((step) => step.kind !== 'confirm').length
                : pendingSteps.length
            }
            value={readWorkRequestChatStepValue(activeStep, answers)}
            busy={busy !== null}
            onChoice={commitChoice}
            onContinue={(value) => commitText(value)}
            onSkip={() => commitText('', true)}
          />
        )}

        {!finalized && isConfirm && (
          <WorkRequestChatConfirmCard
            steps={allSteps.filter((step) => step.kind !== 'confirm')}
            answers={answers}
            busy={busy}
            onBack={() => setStepIndex((index) => Math.max(0, index - 1))}
            onSubmit={() => void submitRequest()}
            onEdit={setEditingStepId}
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
            placeholder="Message Pixel…"
            disabled={busy !== null}
            className="body-3 input-glass rounded-spacing-2 border-border bg-card px-spacing-3 py-spacing-2 focus:ring-ring max-h-28 min-h-[40px] w-full resize-y border outline-none focus:ring-2"
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
