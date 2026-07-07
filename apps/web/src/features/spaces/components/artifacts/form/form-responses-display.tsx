import type { ReactNode } from 'react'
import type { FormQuestion } from '@/lib/forms'

export function formatRelativeTime(iso: string): string {
  const date = new Date(iso)
  const diff = Date.now() - date.getTime()
  const min = Math.round(diff / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hours = Math.round(min / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString()
}

export function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return true
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object')
    return Object.values(value as Record<string, unknown>).every(isEmptyValue)
  return false
}

function valueToString(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return value.map(valueToString).filter(Boolean).join(', ')
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => {
        const inner = valueToString(v)
        return inner ? `${k}: ${inner}` : ''
      })
      .filter(Boolean)
      .join(', ')
  }
  return ''
}

function buildOptionLabelLookup(question: FormQuestion): Map<string, string> {
  const map = new Map<string, string>()
  for (const opt of question.options ?? []) {
    if (opt?.id) map.set(opt.id, (opt.label ?? opt.id).trim() || opt.id)
  }
  return map
}

/** Stored answers use option ids (`opt_…`); map to builder labels for display. */
function questionResolvesSelectOptions(question: FormQuestion): boolean {
  if (question.type === 'single_select' || question.type === 'multi_select') return true
  if (question.type === 'task_property' && (question.options?.length ?? 0) > 0) return true
  return false
}

/** Plain-text display for titles and list previews (selects → labels). */
function answerValueDisplayString(value: unknown, question: FormQuestion | null): string {
  if (!question || !questionResolvesSelectOptions(question)) {
    return valueToString(value)
  }
  const labels = buildOptionLabelLookup(question)
  if (
    question.type === 'multi_select' ||
    (Array.isArray(value) && question.type !== 'single_select')
  ) {
    const arr = Array.isArray(value) ? value : value != null && value !== '' ? [value] : []
    return arr
      .map((entry) => {
        const id = typeof entry === 'string' ? entry : String(entry)
        return labels.get(id) ?? id
      })
      .filter(Boolean)
      .join(', ')
  }
  if (typeof value === 'string') {
    return labels.get(value) ?? value
  }
  return valueToString(value)
}

function contactDisplay(value: unknown): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const obj = value as Record<string, unknown>
  const first = typeof obj.first_name === 'string' ? obj.first_name.trim() : ''
  const last = typeof obj.last_name === 'string' ? obj.last_name.trim() : ''
  const name = typeof obj.name === 'string' ? obj.name.trim() : ''
  const fullName = [first, last].filter(Boolean).join(' ').trim() || name
  if (fullName) return fullName
  const email = typeof obj.email === 'string' ? obj.email.trim() : ''
  if (email) return email
  const phone = typeof obj.phone === 'string' ? obj.phone.trim() : ''
  if (phone) return phone
  const company = typeof obj.business_name === 'string' ? obj.business_name.trim() : ''
  if (company) return company
  return null
}

export function resolveResponseTitle(
  answers: Record<string, unknown>,
  questions: FormQuestion[],
  submitterEmail: string | null,
): string {
  for (const q of questions) {
    if (q.type !== 'contact') continue
    const display = contactDisplay(answers[q.id])
    if (display) return display
  }
  const labelMatchers = [/name/i, /email/i, /phone/i]
  const candidateTypes = new Set(['short_text', 'long_text', 'number'])
  for (const matcher of labelMatchers) {
    for (const q of questions) {
      if (!candidateTypes.has(q.type)) continue
      if (!matcher.test(q.label)) continue
      const text = answerValueDisplayString(answers[q.id], q)
      if (text) return text
    }
  }
  for (const q of questions) {
    if (!candidateTypes.has(q.type)) continue
    const text = answerValueDisplayString(answers[q.id], q)
    if (text) return text.length > 80 ? `${text.slice(0, 80)}…` : text
  }
  if (submitterEmail && submitterEmail.trim()) return submitterEmail.trim()
  return 'Anonymous'
}

export function findResponseTitleQuestionId(
  answers: Record<string, unknown>,
  questions: FormQuestion[],
  title: string,
): string | null {
  const titleField = questions.find(
    (q) => q.type === 'contact' && Boolean(contactDisplay(answers[q.id])),
  )
  if (titleField) return titleField.id

  for (const q of questions) {
    const text = answerValueDisplayString(answers[q.id], q)
    if (text && text === title) return q.id
  }
  return null
}

/** Up-to-3 short field summaries to preview under the title row. */
export function buildPreviewLine(
  answers: Record<string, unknown>,
  questions: FormQuestion[],
  excludeIds: Set<string>,
): string {
  const parts: string[] = []
  for (const q of questions) {
    if (excludeIds.has(q.id)) continue
    if (q.type === 'info_block') continue
    const raw = answers[q.id]
    if (isEmptyValue(raw)) continue
    const text = answerValueDisplayString(raw, q)
    if (!text) continue
    const trimmed = text.length > 40 ? `${text.slice(0, 40)}…` : text
    parts.push(`${q.label || q.id}: ${trimmed}`)
    if (parts.length >= 3) break
  }
  return parts.join(' · ')
}

export function renderAnswerValue(
  value: unknown,
  opts?: { plain?: boolean; question?: FormQuestion },
): ReactNode {
  const question = opts?.question
  if (value === null || value === undefined || value === '') {
    return <span className="text-muted-foreground italic">No answer</span>
  }
  if (!opts?.plain && question && questionResolvesSelectOptions(question)) {
    const labels = buildOptionLabelLookup(question)
    if (question.type === 'multi_select' && Array.isArray(value)) {
      if (value.length === 0) return <span className="text-muted-foreground italic">No answer</span>
      return (
        <ul className="space-y-spacing-0-5 list-inside list-disc">
          {value.map((entry, idx) => {
            const id = typeof entry === 'string' ? entry : String(entry)
            const text = labels.get(id) ?? id
            return (
              <li key={idx} className="break-words">
                {text}
              </li>
            )
          })}
        </ul>
      )
    }
    if (typeof value === 'string' && value) {
      return <span className="whitespace-pre-wrap break-words">{labels.get(value) ?? value}</span>
    }
  }
  if (typeof value === 'string') {
    return <span className="whitespace-pre-wrap break-words">{value}</span>
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return <span>{String(value)}</span>
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-muted-foreground italic">No answer</span>
    return (
      <ul className="space-y-spacing-0-5 list-inside list-disc">
        {value.map((entry, idx) => (
          <li key={idx} className="break-words">
            {valueToString(entry)}
          </li>
        ))}
      </ul>
    )
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).filter(
      ([, v]) => !isEmptyValue(v),
    )
    if (entries.length === 0) return <span className="text-muted-foreground italic">No answer</span>
    return (
      <div className="space-y-spacing-0-5">
        {entries.map(([k, v]) => (
          <div key={k} className="gap-spacing-2 grid grid-cols-[8rem_minmax(0,1fr)] items-baseline">
            <span className="typo-caption text-muted-foreground capitalize">
              {k.replace(/_/g, ' ')}
            </span>
            <span className="body-3 text-foreground break-words">{valueToString(v)}</span>
          </div>
        ))}
      </div>
    )
  }
  return opts?.plain ? <span>{String(value)}</span> : null
}
