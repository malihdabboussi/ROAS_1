import type { CSSProperties } from 'react'
import type { FormQuestion, FormQuestionType } from '@/lib/forms'
import { cn } from '@/lib/utils/cn'
import { getContactSubfieldMeta, resolveContactSubfields } from './contact-subfields'
import { resolveFormSelectOptions } from './form-field-binding'

const FULL_ROW_TYPES: ReadonlySet<FormQuestionType> = new Set<FormQuestionType>([
  'info_block',
  'long_text',
  'contact',
])

export function isFullRowPreviewQuestion(type: FormQuestionType): boolean {
  return FULL_ROW_TYPES.has(type)
}

export function FormPreviewFieldPreview({
  question,
  isTwoCol,
  inputStyle,
  accentStyle,
}: {
  question: FormQuestion
  isTwoCol: boolean
  inputStyle?: CSSProperties
  accentStyle?: CSSProperties
}) {
  const useCustomInput = Boolean(inputStyle)
  const inputBaseClass = 'rounded-spacing-2 body-3 px-spacing-3 w-full border outline-none'
  const inputDefaultClass =
    'border-border bg-background text-foreground placeholder:text-muted-foreground'
  const inputClasses = `${inputBaseClass} ${useCustomInput ? '' : inputDefaultClass}`

  if (question.type === 'info_block') {
    return (
      <div className="banner-glass-purple rounded-spacing-3 p-spacing-4">
        <p className="body-3 font-medium">{question.label}</p>
        {question.description ? (
          <p className="body-4 mt-spacing-1 opacity-65">{question.description}</p>
        ) : null}
      </div>
    )
  }
  if (question.type === 'long_text') {
    return (
      <textarea
        className={`${inputClasses} h-spacing-24 py-spacing-2 resize-none`}
        style={inputStyle}
        placeholder={question.placeholder ?? 'Enter text'}
      />
    )
  }
  if (question.type === 'single_select' || question.type === 'multi_select') {
    const rows = resolveFormSelectOptions(null, question.options)
    return (
      <div className="space-y-spacing-2">
        {rows.map((option) => (
          <label key={option.id} className="body-3 gap-spacing-2 flex items-center opacity-80">
            <input
              type={question.type === 'single_select' ? 'radio' : 'checkbox'}
              name={question.id}
              style={accentStyle}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    )
  }
  if (question.type === 'checkbox') {
    return (
      <label className="body-3 gap-spacing-2 flex items-center opacity-80">
        <input type="checkbox" className="shrink-0" style={accentStyle} />
        {question.placeholder ?? 'Yes'}
      </label>
    )
  }
  if (question.type === 'contact') {
    const subfields = resolveContactSubfields(question)
    return (
      <div className={cn('gap-spacing-2 grid', isTwoCol && 'grid-cols-2')}>
        {subfields.map((id) => {
          const meta = getContactSubfieldMeta(id)
          if (!meta) return null
          return (
            <input
              key={id}
              type={meta.inputType}
              className={`${inputClasses} h-spacing-9`}
              style={inputStyle}
              placeholder={meta.placeholder}
            />
          )
        })}
      </div>
    )
  }
  if (question.type === 'signature') {
    return (
      <div
        className={`h-spacing-24 rounded-spacing-2 flex items-center justify-center border ${useCustomInput ? '' : 'border-border bg-background text-muted-foreground'}`}
        style={inputStyle}
      >
        Signature
      </div>
    )
  }
  if (question.type === 'uploads') {
    return (
      <div
        className={`h-spacing-16 rounded-spacing-2 flex items-center justify-center border ${useCustomInput ? '' : 'border-border bg-background text-muted-foreground'}`}
        style={inputStyle}
      >
        Upload file
      </div>
    )
  }

  return (
    <input
      type={question.type === 'number' ? 'number' : question.type === 'dates' ? 'date' : 'text'}
      className={`${inputClasses} h-spacing-9 focus:ring-ring focus:ring-2`}
      style={inputStyle}
      placeholder={question.placeholder ?? 'Enter text'}
    />
  )
}
