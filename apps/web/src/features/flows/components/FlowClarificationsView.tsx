'use client'

import { useMemo, useState } from 'react'
import { MessageCircleQuestion } from 'lucide-react'
import { toast } from 'sonner'
import type { FlowBuildClarification } from '@vibey/api-shared/types/flow-builder'
import { ClarificationCard } from '@/components/chat'
import {
  mapOpenFlowClarificationQuestions,
  submitFlowClarificationAnswers,
} from '../lib/flow-clarification-ui'

interface FlowClarificationsViewProps {
  spaceId: string
  sessionId: string
  clarifications: FlowBuildClarification[]
  onAnswered?: () => void
}

export function FlowClarificationsView({
  spaceId,
  sessionId,
  clarifications,
  onAnswered,
}: FlowClarificationsViewProps) {
  const [submitting, setSubmitting] = useState(false)
  const questions = useMemo(
    () => mapOpenFlowClarificationQuestions(clarifications),
    [clarifications],
  )

  if (questions.length === 0) return null

  const handleSubmit = async (answers: Record<string, string | string[]>) => {
    setSubmitting(true)
    try {
      await submitFlowClarificationAnswers({ spaceId, sessionId, questions, answers })
      toast.success('Answers saved')
      onAnswered?.()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="border-border px-spacing-4 py-spacing-3 gap-spacing-2 flex shrink-0 items-center border-b">
        <MessageCircleQuestion className="icon-md text-muted-foreground shrink-0" />
        <div className="min-w-0">
          <h2 className="body-2 text-foreground font-semibold">Clarifications</h2>
          <p className="body-4 text-muted-foreground truncate">{questions.length} open choices</p>
        </div>
      </div>
      <div className="p-spacing-4 min-h-0 flex-1 overflow-y-auto">
        <ClarificationCard
          title="Flow choices"
          questions={questions}
          status={submitting ? 'submitted' : 'pending'}
          onSubmit={(answers) => void handleSubmit(answers)}
        />
      </div>
    </div>
  )
}
