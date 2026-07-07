import { Inbox } from 'lucide-react'
import type { FormQuestion, FormResponse } from '@/lib/forms'
import {
  buildPreviewLine,
  findResponseTitleQuestionId,
  formatRelativeTime,
  isEmptyValue,
  renderAnswerValue,
  resolveResponseTitle,
} from './form-responses-display'

export function FormResponsesList({
  responses,
  questions,
  onSelectResponse,
}: {
  responses: FormResponse[]
  questions: FormQuestion[]
  onSelectResponse: (responseId: string) => void
}) {
  if (responses.length === 0) {
    return (
      <div className="gap-spacing-2 px-spacing-6 flex h-full flex-col items-center justify-center text-center">
        <Inbox className="text-muted-foreground/40 h-8 w-8" />
        <p className="body-3 text-muted-foreground">
          No responses yet. They’ll appear here as people submit the form.
        </p>
      </div>
    )
  }

  return (
    <ul className="divide-border divide-y">
      {responses.map((row) => {
        const answers = row.answers ?? {}
        const title = resolveResponseTitle(answers, questions, row.submitter_email ?? null)
        const titleQuestionId = findResponseTitleQuestionId(answers, questions, title)
        const exclude = new Set<string>(titleQuestionId ? [titleQuestionId] : [])
        const preview = buildPreviewLine(answers, questions, exclude)

        return (
          <li key={row.id}>
            <button
              type="button"
              onClick={() => onSelectResponse(row.id)}
              className="hover:bg-hover-subtle px-spacing-4 py-spacing-3 gap-spacing-1 flex w-full flex-col text-left transition-colors"
            >
              <div className="gap-spacing-3 flex items-center justify-between">
                <span className="body-3 text-foreground min-w-0 truncate font-medium">
                  {title}
                </span>
                <span className="typo-caption text-muted-foreground shrink-0">
                  {formatRelativeTime(row.submitted_at)}
                </span>
              </div>
              {preview ? <p className="body-4 text-muted-foreground line-clamp-2">{preview}</p> : null}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

export function ResponseDetailView({
  response,
  questions,
}: {
  response: FormResponse
  questions: FormQuestion[]
}) {
  const answers = response.answers ?? {}
  const questionIds = new Set(questions.map((q) => q.id))
  const orphanIds = Object.keys(answers).filter((id) => !questionIds.has(id))
  const answeredQuestions = questions.filter(
    (q) => q.type !== 'info_block' && !isEmptyValue(answers[q.id]),
  )
  const orphanIdsNonEmpty = orphanIds.filter((id) => !isEmptyValue(answers[id]))

  return (
    <div className="px-spacing-4 py-spacing-4 space-y-spacing-4">
      <div className="gap-spacing-2 flex flex-col">
        <span className="typo-caption text-muted-foreground uppercase tracking-wider">
          Submitted
        </span>
        <span className="body-3 text-foreground">
          {new Date(response.submitted_at).toLocaleString()}
        </span>
        {response.submitter_email ? (
          <>
            <span className="typo-caption text-muted-foreground mt-spacing-2 uppercase tracking-wider">
              Submitter email
            </span>
            <span className="body-3 text-foreground break-words">{response.submitter_email}</span>
          </>
        ) : null}
      </div>

      <div className="border-border border-t" />

      <div className="space-y-spacing-3">
        {answeredQuestions.map((q) => (
          <div key={q.id} className="gap-spacing-1 flex flex-col">
            <span className="body-4 text-muted-foreground font-medium">{q.label || q.id}</span>
            <div className="body-3 text-foreground">
              {renderAnswerValue(answers[q.id], { question: q })}
            </div>
          </div>
        ))}

        {orphanIdsNonEmpty.map((id) => (
          <div key={id} className="gap-spacing-1 flex flex-col">
            <span className="body-4 text-muted-foreground font-medium">{id}</span>
            <div className="body-3 text-foreground">
              {renderAnswerValue(answers[id], { plain: true })}
            </div>
          </div>
        ))}

        {answeredQuestions.length === 0 && orphanIdsNonEmpty.length === 0 ? (
          <p className="body-3 text-muted-foreground">No answers in this response.</p>
        ) : null}
      </div>
    </div>
  )
}
