'use client'

import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { FormQuestion, FormQuestionType } from '@/lib/forms/forms-api'
import { cn } from '@/lib/utils/cn'
import { buildBoundQuestion, fieldTypeForQuestion } from './form-field-binding'
import { FormFieldBindSubmenu } from './FormFieldBindSubmenu'
import { FormQuestionEditor } from './FormQuestionEditor'
import { FORM_QUESTION_TYPES } from './FormQuestionTypePicker'

export function FormAddBlockRail({
  questions,
  selectedQuestionId,
  onSelectQuestion,
  targetSpaceId,
  onOpenSettings,
  onAppend,
  onUpdateQuestion,
  onDeleteQuestion,
  resetBindingKey,
}: {
  questions: FormQuestion[]
  selectedQuestionId: string | null
  onSelectQuestion: (id: string | null) => void
  targetSpaceId?: string | null
  onOpenSettings?: () => void
  onAppend: (question: FormQuestion) => void
  onUpdateQuestion: (next: FormQuestion) => void
  onDeleteQuestion: (id: string) => void
  /** When this value changes, clears any selected question or pending bind step. */
  resetBindingKey?: string | number
}) {
  const [bindType, setBindType] = useState<FormQuestionType | null>(null)
  const [resetTick, setResetTick] = useState(resetBindingKey)

  useEffect(() => {
    if (resetBindingKey !== resetTick) {
      setResetTick(resetBindingKey)
      setBindType(null)
      onSelectQuestion(null)
    }
  }, [resetBindingKey, resetTick, onSelectQuestion])

  const selected =
    selectedQuestionId != null ? (questions.find((q) => q.id === selectedQuestionId) ?? null) : null

  const showHeader = selected != null || bindType != null
  const onBack = () => {
    if (selected) {
      onSelectQuestion(null)
      return
    }
    setBindType(null)
  }

  return (
    <aside className="border-border bg-background rounded-spacing-4 flex min-h-0 w-80 shrink-0 flex-col overflow-hidden border">
      <div className="border-border bg-muted px-spacing-4 py-spacing-3 shrink-0 border-b">
        <p className="body-3 text-foreground font-semibold">Add block</p>
      </div>
      <div className="p-spacing-2 min-h-0 flex-1 overflow-y-auto">
        {showHeader ? (
          <button
            type="button"
            onClick={onBack}
            className="body-3 hover:bg-hover-subtle mb-spacing-2 px-spacing-2 inline-flex h-7 w-full items-center gap-1 rounded-md text-left font-semibold text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--foreground)]"
          >
            <ChevronLeft className="h-3.5 w-3.5 shrink-0" />
            Back
          </button>
        ) : null}

        {selected ? (
          <FormQuestionEditor
            question={selected}
            variant="rail"
            targetSpaceId={targetSpaceId}
            onChange={onUpdateQuestion}
            onDelete={() => {
              onDeleteQuestion(selected.id)
              onSelectQuestion(null)
            }}
            onOpenSettings={onOpenSettings}
          />
        ) : bindType ? (
          <FormFieldBindSubmenu
            questionType={bindType}
            targetSpaceId={targetSpaceId}
            layout="rail"
            onPickField={(field) => {
              const created = buildBoundQuestion(bindType, field)
              onAppend(created)
              onSelectQuestion(created.id)
              setBindType(null)
            }}
            onOpenSettings={onOpenSettings}
          />
        ) : (
          <div className="space-y-0.5">
            {FORM_QUESTION_TYPES.map((item) => {
              const Icon = item.icon
              const bindsField = Boolean(fieldTypeForQuestion(item.type))
              return (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => {
                    if (!bindsField) {
                      const created = buildBoundQuestion(item.type as FormQuestionType, null)
                      onAppend(created)
                      onSelectQuestion(created.id)
                      return
                    }
                    setBindType(item.type as FormQuestionType)
                  }}
                  className={cn(
                    'gap-spacing-2 px-spacing-2 py-spacing-1 flex w-full items-center rounded-lg text-left transition-colors',
                    'hover:bg-[var(--color-hover-subtle)]',
                  )}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
                  <span className="body-3 min-w-0 flex-1 truncate text-[var(--foreground)]">
                    {item.label}
                  </span>
                  {bindsField ? (
                    <ChevronRight className="h-3 w-3 shrink-0 text-[var(--color-muted-foreground)]" />
                  ) : null}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </aside>
  )
}
