import type { FlowBuildClarification } from '@vibey/api-shared/types/flow-builder'
import type { ClarificationCardProps } from '@/components/chat'
import { dispatchTeamHrChatCompose } from '@/lib/agents/side-chat-compose'
import { answerFlowClarifications } from '../services/flows.service'

export const FLOW_CLARIFICATION_ANSWER_EVENT = 'flow:clarification-answer'

export type FlowClarificationAnswerDetail = {
  answers: Record<string, string | string[]>
  questions: ClarificationCardProps['questions']
}

export function mapOpenFlowClarificationQuestions(
  clarifications: FlowBuildClarification[],
): ClarificationCardProps['questions'] {
  return clarifications
    .filter((row) => row.status === 'open')
    .map((row) => ({
      id: row.question.id,
      text: row.question.text,
      type: row.question.type,
      options: row.question.options,
      required: row.question.required,
    }))
}

export function formatFlowClarificationAnswersForLoop(
  questions: ClarificationCardProps['questions'],
  answers: Record<string, string | string[]>,
) {
  const byId = new Map(questions.map((question) => [question.id, question.text]))
  const lines = Object.entries(answers).map(([questionId, answer]) => {
    const value = Array.isArray(answer) ? answer.join(', ') : answer
    return `- ${byId.get(questionId) ?? questionId}: ${value}`
  })
  return ['Flow clarification answers:', ...lines].join('\n')
}

export function buildFlowClarificationContentBlock(
  clarifications: FlowBuildClarification[],
): Record<string, unknown> | null {
  const questions = mapOpenFlowClarificationQuestions(clarifications)
  if (questions.length === 0) return null

  return {
    type: 'clarification',
    id: `flow-clarify-${clarifications.map((row) => row.id).join('-')}`,
    source: 'flow',
    title: 'Flow choices',
    questions,
    status: 'pending',
  }
}

export function dispatchFlowClarificationAnswer(detail: FlowClarificationAnswerDetail) {
  window.dispatchEvent(new CustomEvent(FLOW_CLARIFICATION_ANSWER_EVENT, { detail }))
}

export async function submitFlowClarificationAnswers(input: {
  spaceId: string
  sessionId: string
  questions: ClarificationCardProps['questions']
  answers: Record<string, string | string[]>
}) {
  await answerFlowClarifications(input.spaceId, input.sessionId, input.answers)
  dispatchTeamHrChatCompose({
    text: formatFlowClarificationAnswersForLoop(input.questions, input.answers),
    submit: true,
  })
}
