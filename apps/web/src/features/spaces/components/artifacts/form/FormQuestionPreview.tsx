import { EyeOff } from 'lucide-react'
import type { FormQuestion } from '@/lib/forms'
import { getContactSubfieldMeta, resolveContactSubfields } from './contact-subfields'
import { resolveFormSelectOptions } from './form-field-binding'

export function QuestionDisplay({ question }: { question: FormQuestion }) {
  if (question.type === 'info_block') {
    return (
      <div className="banner-glass-purple rounded-spacing-3 p-spacing-4">
        <p className="body-3 text-foreground gap-spacing-1 inline-flex flex-wrap items-center font-medium">
          <span>{question.label}</span>
          {question.hidden ? <HiddenQuestionBadge /> : null}
        </p>
        {question.description ? (
          <p className="body-4 text-muted-foreground mt-spacing-1">{question.description}</p>
        ) : null}
      </div>
    )
  }

  return (
    <div className="space-y-spacing-2">
      <label className="body-3 text-foreground gap-spacing-1 inline-flex flex-wrap items-center font-medium">
        <span>{question.label}</span>
        {question.required ? <span className="text-destructive"> *</span> : null}
        {question.hidden ? <HiddenQuestionBadge /> : null}
      </label>
      {question.description ? (
        <p className="body-4 text-muted-foreground">{question.description}</p>
      ) : null}
      <QuestionFieldPreview question={question} />
    </div>
  )
}

function HiddenQuestionBadge() {
  return (
    <span
      className="text-muted-foreground inline-flex shrink-0"
      title="Hidden from form"
      role="img"
      aria-label="Hidden from form"
    >
      <EyeOff className="icon-xs" aria-hidden />
    </span>
  )
}

function QuestionFieldPreview({ question }: { question: FormQuestion }) {
  if (question.type === 'long_text') {
    return (
      <textarea
        className="h-spacing-24 body-3 rounded-spacing-2 border-border bg-background text-foreground px-spacing-3 py-spacing-2 w-full resize-none border"
        placeholder={question.placeholder ?? 'Enter text'}
        readOnly
      />
    )
  }
  if (question.type === 'single_select' || question.type === 'multi_select') {
    const optionRows = resolveFormSelectOptions(null, question.options)
    return (
      <div className="space-y-spacing-2">
        {optionRows.map((option) => (
          <label
            key={option.id}
            className="body-3 text-muted-foreground gap-spacing-2 flex items-center"
          >
            <input
              type={question.type === 'single_select' ? 'radio' : 'checkbox'}
              name={question.id}
              disabled
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    )
  }
  if (question.type === 'checkbox') {
    return (
      <label className="body-3 text-muted-foreground gap-spacing-2 flex items-center">
        <input type="checkbox" className="checkbox-glass-green shrink-0" disabled />
        {question.placeholder ?? 'Yes'}
      </label>
    )
  }
  if (question.type === 'contact') {
    const subfields = resolveContactSubfields(question)
    return (
      <div className="gap-spacing-2 grid">
        {subfields.map((id) => {
          const meta = getContactSubfieldMeta(id)
          if (!meta) return null
          return (
            <input
              key={id}
              type={meta.inputType}
              className="h-spacing-9 body-3 rounded-spacing-2 border-border bg-background text-foreground placeholder:text-muted-foreground px-spacing-3 w-full border outline-none"
              placeholder={meta.placeholder}
              readOnly
            />
          )
        })}
      </div>
    )
  }
  if (question.type === 'signature') {
    return (
      <div className="h-spacing-24 rounded-spacing-2 border-border bg-background text-muted-foreground flex items-center justify-center border">
        Signature
      </div>
    )
  }
  if (question.type === 'uploads') {
    return (
      <div className="h-spacing-16 rounded-spacing-2 border-border bg-background text-muted-foreground flex items-center justify-center border">
        Upload file
      </div>
    )
  }
  return (
    <input
      type={question.type === 'number' ? 'number' : question.type === 'dates' ? 'date' : 'text'}
      className="h-spacing-9 body-3 rounded-spacing-2 border-border bg-background text-foreground placeholder:text-muted-foreground px-spacing-3 w-full border outline-none"
      placeholder={question.placeholder ?? 'Enter text'}
      readOnly
    />
  )
}
