'use client'

import { useMemo, useState } from 'react'
import type { FlowBuildClarification } from '@vibey/api-shared/types/flow-builder'
import { toast } from 'sonner'
import { ClarificationCard } from '@/components/chat'
import {
  mapOpenFlowClarificationQuestions,
  submitFlowClarificationAnswers,
} from '../lib/flow-clarification-ui'

export function FlowBuildClarificationsComposer({
  spaceId,
  sessionId,
  clarifications,
  onAnswered,
  maxQuestions = 3,
}: {
  spaceId: string
  sessionId: string
  clarifications: FlowBuildClarification[]
  onAnswered?: () => void
  maxQuestions?: number
}) {
  const [submitting, setSubmitting] = useState(false)
  const questions = useMemo(
    () => mapOpenFlowClarificationQuestions(clarifications),
    [clarifications],
  )

  if (questions.length === 0 || questions.length > maxQuestions) return null

  return (
    <div className="w-full min-w-0">
      <ClarificationCard
        title="Flow choices"
        questions={questions}
        status={submitting ? 'submitted' : 'pending'}
        onSubmit={(answers) => {
          setSubmitting(true)
          void submitFlowClarificationAnswers({ spaceId, sessionId, questions, answers })
            .then(() => {
              toast.success('Answers saved')
              onAnswered?.()
            })
            .finally(() => setSubmitting(false))
        }}
      />
    </div>
  )
}
