type FormQuestion = {
  id: string
  type: string
  label?: string
  hidden?: boolean
  contact_subfields?: string[]
}

const AUTO_TASK_TITLE = 'auto'
const TASK_TITLE_SUBFIELD_SEP = '::'

export function isAutoTaskTitleSource(source: unknown): boolean {
  return source === undefined || source === null || source === '' || source === AUTO_TASK_TITLE
}

export function parseTaskTitleSource(
  source: string,
):
  | { kind: 'question'; questionId: string }
  | { kind: 'contact_subfield'; questionId: string; subfieldId: string } {
  const index = source.indexOf(TASK_TITLE_SUBFIELD_SEP)
  if (index === -1) return { kind: 'question', questionId: source }
  return {
    kind: 'contact_subfield',
    questionId: source.slice(0, index),
    subfieldId: source.slice(index + TASK_TITLE_SUBFIELD_SEP.length),
  }
}

function contactSubfieldValue(record: Record<string, unknown>, subfieldId: string): string | null {
  if (subfieldId === 'email') return contactEmail(record)
  return formatScalar(record[subfieldId])
}

function strFromRecord(source: Record<string, unknown>, key: string): string {
  const raw = source[key]
  return typeof raw === 'string' ? raw.trim() : ''
}

function contactDisplayName(value: Record<string, unknown>): string | null {
  const fullName = strFromRecord(value, 'name')
  if (fullName) return fullName
  const firstName = strFromRecord(value, 'first_name')
  const lastName = strFromRecord(value, 'last_name')
  const combined = [firstName, lastName].filter(Boolean).join(' ')
  return combined || null
}

function contactEmail(value: Record<string, unknown>): string | null {
  const email = strFromRecord(value, 'email').toLowerCase()
  return email || null
}

function formatScalar(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed || null
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return null
}

export function answerAsTaskTitle(value: unknown, question: FormQuestion): string | null {
  if (question.type === 'contact') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null
    const record = value as Record<string, unknown>
    return contactDisplayName(record) ?? contactEmail(record)
  }

  if (Array.isArray(value)) {
    const parts = value
      .map((entry) => formatScalar(entry))
      .filter((entry): entry is string => Boolean(entry))
    return parts.length > 0 ? parts.join(', ') : null
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([key, raw]) => {
        const formatted = formatScalar(raw)
        return formatted ? `${key}: ${formatted}` : null
      })
      .filter((entry): entry is string => Boolean(entry))
    return entries.length > 0 ? entries.join(', ') : null
  }

  return formatScalar(value)
}

function visibleQuestions(questions: FormQuestion[]): FormQuestion[] {
  return questions.filter((question) => !question.hidden && question.type !== 'info_block')
}

function autoContactName(
  questions: FormQuestion[],
  answers: Record<string, unknown>,
): string | null {
  for (const question of visibleQuestions(questions)) {
    if (question.type !== 'contact') continue
    const value = answers[question.id]
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue
    const name = contactDisplayName(value as Record<string, unknown>)
    if (name) return name
  }
  return null
}

function autoContactEmail(
  questions: FormQuestion[],
  answers: Record<string, unknown>,
): string | null {
  for (const question of visibleQuestions(questions)) {
    if (question.type !== 'contact') continue
    const value = answers[question.id]
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue
    const email = contactEmail(value as Record<string, unknown>)
    if (email) return email
  }
  return null
}

export function resolveFormTaskTitle(input: {
  formName: string
  questions: FormQuestion[]
  answers: Record<string, unknown>
  taskTitleQuestionId?: unknown
}): string {
  const source = input.taskTitleQuestionId
  if (!isAutoTaskTitleSource(source)) {
    const parsed = parseTaskTitleSource(String(source))
    const question = input.questions.find((entry) => entry.id === parsed.questionId)
    if (question) {
      if (parsed.kind === 'contact_subfield' && question.type === 'contact') {
        const value = input.answers[question.id]
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          const title = contactSubfieldValue(value as Record<string, unknown>, parsed.subfieldId)
          if (title) return title.slice(0, 1000)
        }
      } else {
        const title = answerAsTaskTitle(input.answers[question.id], question)
        if (title) return title.slice(0, 1000)
      }
    }
  }

  const contactName = autoContactName(input.questions, input.answers)
  if (contactName) return contactName.slice(0, 1000)

  const contactEmail = autoContactEmail(input.questions, input.answers)
  if (contactEmail) return contactEmail.slice(0, 1000)

  const formName = input.formName.trim() || 'Form'
  return `New form "${formName}" is Submitted`
}
