'use client'

import { useState } from 'react'
import { Check, Loader2, MessageCircleQuestion, X } from 'lucide-react'
import {
  ClarificationQuestionStep,
  type ClarificationQuestion,
} from './clarification-card-question-step'

export interface ClarificationCardProps {
  title: string
  introMessage?: string
  questions: ClarificationQuestion[]
  status?: 'pending' | 'submitted' | 'skipped'
  answers?: Record<string, string | string[]>
  onSubmit?: (answers: Record<string, string | string[]>) => void
  onSkip?: () => void
}

export function ClarificationCard({
  title,
  introMessage,
  questions,
  status = 'pending',
  answers: initialAnswers,
  onSubmit,
  onSkip,
}: ClarificationCardProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<string, string | string[]>>(initialAnswers || {})

  const totalSteps = questions.length
  const currentQuestion = questions[currentStep] as ClarificationQuestion | undefined
  const isLastStep = currentStep === totalSteps - 1

  const getAnswerLabel = (
    question: ClarificationQuestion,
    answerValue: string | string[] | undefined,
  ): string => {
    if (!answerValue) return 'No answer'
    if (Array.isArray(answerValue)) {
      return answerValue
        .map((id) => question.options.find((opt) => opt.id === id)?.label || id)
        .join(', ')
    }
    if (answerValue.startsWith('__custom__:')) return answerValue.replace('__custom__:', '')
    return question.options.find((opt) => opt.id === answerValue)?.label || answerValue
  }

  const handleBack = () => {
    setError(null)
    setCurrentStep((prev) => prev - 1)
  }

  const handleNext = () => {
    if (!currentQuestion) return
    const currentAnswer = answers[currentQuestion.id]
    if (currentQuestion.required) {
      if (!currentAnswer) {
        setError('Please answer this question to continue')
        return
      }
      if (typeof currentAnswer === 'string' && currentAnswer.trim() === '') {
        setError('Please answer this question to continue')
        return
      }
      if (Array.isArray(currentAnswer) && currentAnswer.length === 0) {
        setError('Please select at least one option')
        return
      }
    }
    setError(null)
    if (isLastStep) {
      handleSubmit()
    } else {
      setCurrentStep((prev) => prev + 1)
    }
  }

  const handleSubmit = () => {
    if (!onSubmit) return
    setIsProcessing(true)
    setError(null)
    onSubmit(answers)
  }

  const handleSkip = () => {
    if (!onSkip) return
    setIsProcessing(true)
    setError(null)
    onSkip()
  }

  const updateAnswer = (value: string | string[]) => {
    if (!currentQuestion) return
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: value }))
    setError(null)
  }

  if (status === 'submitted') {
    const submittedAnswers = initialAnswers || answers
    return (
      <div className="surface-card mt-spacing-3 rounded-spacing-2 border border-success/30 bg-success/10 p-spacing-3">
        <div className="gap-spacing-2 flex items-start">
          <Check className="icon-sm mt-0.5 flex-shrink-0 text-success" />
          <div className="gap-spacing-1 flex min-w-0 flex-1 flex-col">
            <span className="body-2 text-foreground font-medium">{title}</span>
            {questions.map((question) => (
              <div key={question.id} className="body-3 text-muted-foreground">
                <span>{question.text}</span>
                <span className="mx-1">&rarr;</span>
                <span className="text-success font-medium">
                  {getAnswerLabel(question, submittedAnswers[question.id])}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (status === 'skipped') {
    return (
      <div className="surface-card mt-spacing-3 rounded-spacing-2 border-muted-foreground/30 bg-muted/10 p-spacing-3 border">
        <div className="gap-spacing-2 flex items-center">
          <X className="icon-sm text-muted-foreground flex-shrink-0" />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="body-2 text-foreground font-medium">{title}</span>
            <span className="body-3 text-muted-foreground">Skipped</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-spacing-3">
      <div className="gap-spacing-2 mb-spacing-2 flex items-center">
        <MessageCircleQuestion className="icon-sm text-muted-foreground flex-shrink-0" />
        <span className="body-3 text-muted-foreground">Asking for clarification</span>
      </div>

      {introMessage && <p className="body-2 text-foreground mb-spacing-2">{introMessage}</p>}

      <div className="surface-card border-border rounded-spacing-3 space-y-spacing-3 p-spacing-3 border">
        {currentQuestion && (
          <>
            <div className="gap-spacing-2 flex items-center justify-between">
              <div className="gap-spacing-1 flex min-w-0 flex-1 flex-col">
                <span className="body-2 text-foreground font-medium">
                  {currentQuestion.text}
                  {currentQuestion.required && <span className="text-destructive ml-1">*</span>}
                </span>
                <span className="body-3 text-muted-foreground">
                  {currentQuestion.type === 'multiple_choice' ? 'Select multiple' : 'Select one'}
                </span>
              </div>
              <span className="body-3 text-muted-foreground flex-shrink-0">
                {currentStep + 1}/{totalSteps}
              </span>
            </div>

            <div className="surface-card card-glass rounded-spacing-2 overflow-hidden">
              <ClarificationQuestionStep
                key={currentQuestion.id}
                question={currentQuestion}
                answer={answers[currentQuestion.id]}
                onAnswer={updateAnswer}
                disabled={isProcessing}
              />
            </div>
          </>
        )}

        {error && (
          <div className="rounded-spacing-2 border-destructive/30 bg-destructive/10 px-spacing-3 py-spacing-2 border">
            <span className="body-3 text-destructive">{error}</span>
          </div>
        )}

        <div className="gap-spacing-2 flex items-center justify-between">
          <div className="gap-spacing-2 flex items-center">
            {currentStep > 0 && (
              <button
                onClick={handleBack}
                disabled={isProcessing}
                className="button-glass-neutral rounded-spacing-2 body-3 px-spacing-3 py-spacing-2 hover:bg-hover-subtle hover:text-foreground font-medium transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Back
              </button>
            )}
            <button
              onClick={handleSkip}
              disabled={isProcessing}
              className="button-glass-neutral rounded-spacing-2 body-3 px-spacing-3 py-spacing-2 hover:bg-hover-subtle hover:text-foreground font-medium transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Skip
            </button>
          </div>
          <button
            onClick={handleNext}
            disabled={isProcessing}
            className="button-glass-accent rounded-spacing-2 body-3 gap-spacing-1 px-spacing-4 py-spacing-2 flex items-center font-medium disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isProcessing && <Loader2 className="icon-xs animate-spin" />}
            <span className="relative z-10">
              {isProcessing ? 'Submitting...' : isLastStep ? 'Continue' : 'Next'}
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
