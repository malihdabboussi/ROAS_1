import type {
  PublicWorkRequestDraft,
  WorkRequestOptions,
  WorkRequestPriority,
  WorkRequestType,
  WorkRequestUpdate,
} from '@/lib/work-requests'

export const REQUEST_TYPE_OPTIONS: Array<{ id: WorkRequestType; label: string }> = [
  { id: 'design', label: 'Design' },
  { id: 'copy', label: 'Copy' },
  { id: 'funnel', label: 'Funnel' },
  { id: 'ghl', label: 'GoHighLevel' },
  { id: 'ad', label: 'Ads' },
  { id: 'video', label: 'Video' },
  { id: 'general', label: 'General' },
  { id: 'other', label: 'Other' },
]

export const PRIORITY_OPTIONS: Array<{ id: WorkRequestPriority; label: string }> = [
  { id: 'low', label: 'Low' },
  { id: 'medium', label: 'Medium' },
  { id: 'high', label: 'High' },
  { id: 'urgent', label: 'Urgent' },
]

const KNOWN_REQUIRED_FIELDS = new Set([
  'title',
  'description',
  'due_date',
  'priority',
  'campaign_space_id',
  'general_space_id',
  'links',
  'assets',
  'dependencies',
])

export type WorkRequestChatStepKind =
  | 'single_choice'
  | 'text'
  | 'textarea'
  | 'date'
  | 'assets'
  | 'confirm'

export type WorkRequestChatStep = {
  id: string
  field: keyof WorkRequestUpdate | 'confirm' | `structured:${string}`
  kind: WorkRequestChatStepKind
  prompt: string
  hint?: string
  required: boolean
  /** Use a searchable closed dropdown instead of an open option list. */
  searchable?: boolean
  /** Show an Other… row with a free-text input under the options. */
  allowOther?: boolean
  options?: Array<{ id: string; label: string; description?: string }>
}

export type WorkRequestChatAnswers = {
  client_workspace_id: string
  campaign_space_id: string
  request_type: WorkRequestType
  priority: WorkRequestPriority
  assignee_name: string
  assignee_id: string
  assignee_email: string
  title: string
  description: string
  due_date: string
  links: string
  assets: string
  dependencies: string
  structured_fields: Record<string, string>
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

function matchTeamMember(
  options: WorkRequestOptions,
  value: string,
): NonNullable<WorkRequestOptions['team_members']>[number] | undefined {
  const needle = value.trim().toLocaleLowerCase()
  if (!needle) return undefined
  return (options.team_members ?? []).find((member) => {
    const email = (member.email ?? '').trim().toLocaleLowerCase()
    return (
      member.id === value ||
      member.name.trim().toLocaleLowerCase() === needle ||
      (email && email === needle)
    )
  })
}

export function draftToChatAnswers(
  draft: PublicWorkRequestDraft,
  options: WorkRequestOptions = { client_workspaces: [], campaign_spaces: [] },
): WorkRequestChatAnswers {
  const rawName = draft.assignee_name ?? ''
  const member = matchTeamMember(options, rawName)
  return {
    client_workspace_id: draft.client_workspace_id,
    campaign_space_id: draft.campaign_space_id ?? '',
    request_type: draft.request_type,
    priority: draft.priority,
    assignee_name: member?.name ?? rawName,
    assignee_id: member?.id ?? '',
    assignee_email: member?.email ?? (isEmail(rawName) ? rawName.trim() : ''),
    title: draft.title,
    description: draft.description ?? '',
    due_date: draft.due_date ?? '',
    links: draft.links.join('\n'),
    assets: draft.assets.map((asset) => `${asset.name} | ${asset.url}`).join('\n'),
    dependencies: draft.dependencies
      .map((dependency) => `${dependency.title}${dependency.url ? ` | ${dependency.url}` : ''}`)
      .join('\n'),
    structured_fields: Object.fromEntries(
      Object.entries(draft.structured_fields).map(([key, value]) => [
        key,
        Array.isArray(value) ? value.join(', ') : value == null ? '' : String(value),
      ]),
    ),
  }
}

export function buildWorkRequestChatSteps(
  draft: PublicWorkRequestDraft,
  options: WorkRequestOptions,
  answers: WorkRequestChatAnswers,
): WorkRequestChatStep[] {
  const campaignSpaces = options.campaign_spaces.filter(
    (space) => space.client_workspace_id === answers.client_workspace_id,
  )
  const customFields = draft.required_fields.filter((field) => !KNOWN_REQUIRED_FIELDS.has(field))

  const steps: WorkRequestChatStep[] = [
    {
      id: 'client_workspace_id',
      field: 'client_workspace_id',
      kind: 'single_choice',
      prompt: 'Which client workspace is this for?',
      required: true,
      searchable: true,
      options: options.client_workspaces.map((workspace) => ({
        id: workspace.id,
        label: workspace.name,
      })),
    },
    {
      id: 'campaign_space_id',
      field: 'campaign_space_id',
      kind: 'single_choice',
      prompt: 'Which Campaign Space should own this?',
      hint: 'Pick a campaign, or keep it on general client work.',
      required: false,
      searchable: campaignSpaces.length > 6,
      options: [
        { id: '', label: 'General client work' },
        ...campaignSpaces.map((space) => ({ id: space.id, label: space.name })),
      ],
    },
    {
      id: 'request_type',
      field: 'request_type',
      kind: 'single_choice',
      prompt: 'What type of Service Request is this?',
      required: true,
      options: REQUEST_TYPE_OPTIONS.map((type) => ({ id: type.id, label: type.label })),
    },
    {
      id: 'priority',
      field: 'priority',
      kind: 'single_choice',
      prompt: 'What priority should we set?',
      required: true,
      options: PRIORITY_OPTIONS.map((priority) => ({ id: priority.id, label: priority.label })),
    },
    {
      id: 'assignee_name',
      field: 'assignee_name',
      kind: (options.team_members?.length ?? 0) > 0 ? 'single_choice' : 'text',
      prompt: 'Who on the team should own this?',
      hint:
        (options.team_members?.length ?? 0) > 0
          ? 'Pick a teammate from The ROAS Portal roster, or leave unassigned so Portal assignment rules apply.'
          : 'Optional. Enter a Portal teammate name or email, or skip so Portal assignment rules apply.',
      required: false,
      searchable: (options.team_members?.length ?? 0) > 0,
      allowOther: (options.team_members?.length ?? 0) > 0,
      options: [
        { id: '__unassigned__', label: 'Unassigned' },
        ...(options.team_members ?? []).map((member) => ({
          id: member.id,
          label: member.name,
          description: member.email ?? undefined,
        })),
      ],
    },
    {
      id: 'title',
      field: 'title',
      kind: 'text',
      prompt: 'What should we call this request?',
      required: true,
    },
    {
      id: 'description',
      field: 'description',
      kind: 'textarea',
      prompt: 'Add the brief / description.',
      hint: 'Include scope, constraints, and anything the fulfiller needs.',
      required: true,
    },
    {
      id: 'due_date',
      field: 'due_date',
      kind: 'date',
      prompt: 'When is this due?',
      hint: 'Optional. Skip if there is no hard date.',
      required: false,
    },
    {
      id: 'links',
      field: 'links',
      kind: 'textarea',
      prompt: 'Any links to include?',
      hint: 'One URL per line. Skip if none.',
      required: false,
    },
  ]

  for (const field of customFields) {
    steps.push({
      id: `structured:${field}`,
      field: `structured:${field}`,
      kind: 'text',
      prompt: `What is the ${humanize(field)}?`,
      required: true,
    })
  }

  steps.push(
    {
      id: 'assets',
      field: 'assets',
      kind: 'assets',
      prompt: 'Any source assets or folders?',
      hint: 'Add Drive/folder links (or any URL). Skip if none.',
      required: false,
    },
    {
      id: 'confirm',
      field: 'confirm',
      kind: 'confirm',
      prompt: 'Ready to submit this Service Request?',
      hint: 'Review the answers below, then submit. Use Back or Edit to change anything.',
      required: true,
    },
  )

  return steps
}

/** A step is already answered when the draft/answers carry a real value. */
export function isStepSatisfied(
  step: WorkRequestChatStep,
  answers: WorkRequestChatAnswers,
): boolean {
  if (step.kind === 'confirm') return false
  if (step.field === 'campaign_space_id') {
    // Blank = still on the default "general" bucket — ask unless a Space was chosen.
    return Boolean(answers.campaign_space_id)
  }
  return getAnswerDisplay(step, answers) !== '—'
}

/** Prefill summary rows the user can edit without re-walking the whole flow. */
export function listKnownSteps(
  steps: WorkRequestChatStep[],
  answers: WorkRequestChatAnswers,
): WorkRequestChatStep[] {
  return steps.filter((step) => step.kind !== 'confirm' && isStepSatisfied(step, answers))
}

/** Only ask for gaps (plus confirm). Satisfied fields stay in the known summary. */
export function listPendingSteps(
  steps: WorkRequestChatStep[],
  answers: WorkRequestChatAnswers,
): WorkRequestChatStep[] {
  const gaps = steps.filter((step) => step.kind !== 'confirm' && !isStepSatisfied(step, answers))
  const confirm = steps.find((step) => step.kind === 'confirm')
  return confirm ? [...gaps, confirm] : gaps
}

export function answersToUpdate(answers: WorkRequestChatAnswers): WorkRequestUpdate {
  const assigneeName = answers.assignee_name.trim() || null
  const typedEmail = assigneeName && isEmail(assigneeName) ? assigneeName : null
  const assigneeEmail = answers.assignee_email.trim() || typedEmail
  return {
    client_workspace_id: answers.client_workspace_id,
    campaign_space_id: answers.campaign_space_id || null,
    request_type: answers.request_type,
    assignee_name: assigneeName,
    assignee_id: answers.assignee_id.trim() || null,
    assignee_email: assigneeEmail,
    title: answers.title,
    description: answers.description || null,
    due_date: answers.due_date || null,
    priority: answers.priority,
    links: lines(answers.links),
    assets: pairs(answers.assets).map(({ left, right }) => ({ name: left, url: right })),
    structured_fields: answers.structured_fields,
  }
}

export function getAnswerDisplay(
  step: WorkRequestChatStep,
  answers: WorkRequestChatAnswers,
): string {
  if (step.field === 'confirm') return 'Review'
  if (typeof step.field === 'string' && step.field.startsWith('structured:')) {
    const key = step.field.slice('structured:'.length)
    return answers.structured_fields[key]?.trim() || '—'
  }
  if (step.kind === 'single_choice') {
    const raw =
      step.field === 'assignee_name'
        ? answers.assignee_id || answers.assignee_name
        : String(answers[step.field as keyof WorkRequestChatAnswers] ?? '')
    if (step.field === 'assignee_name' && !answers.assignee_name) return '—'
    return step.options?.find((option) => option.id === raw)?.label ?? (raw || '—')
  }
  const value = answers[step.field as keyof WorkRequestChatAnswers]
  if (typeof value === 'string') return value.trim() || '—'
  return '—'
}

export function applyStepAnswer(
  answers: WorkRequestChatAnswers,
  step: WorkRequestChatStep,
  value: string,
): WorkRequestChatAnswers {
  if (step.field === 'confirm') return answers
  if (typeof step.field === 'string' && step.field.startsWith('structured:')) {
    const key = step.field.slice('structured:'.length)
    return {
      ...answers,
      structured_fields: { ...answers.structured_fields, [key]: value },
    }
  }
  if (step.field === 'campaign_space_id') {
    return { ...answers, campaign_space_id: value }
  }
  if (step.field === 'client_workspace_id') {
    return {
      ...answers,
      client_workspace_id: value,
      campaign_space_id: answers.client_workspace_id === value ? answers.campaign_space_id : '',
    }
  }
  if (step.field === 'request_type') {
    return { ...answers, request_type: value as WorkRequestType }
  }
  if (step.field === 'priority') {
    return { ...answers, priority: value as WorkRequestPriority }
  }
  if (step.field === 'assignee_name') {
    const member = step.options?.find((option) => option.id === value)
    const freeText = value === '__unassigned__' ? '' : value
    const email = member?.description || (isEmail(freeText) ? freeText.trim() : '')
    return {
      ...answers,
      assignee_id: member && member.id !== '__unassigned__' ? member.id : '',
      assignee_name: member && member.id !== '__unassigned__' ? member.label : freeText,
      assignee_email: email,
    }
  }
  return { ...answers, [step.field]: value } as WorkRequestChatAnswers
}

/** Match free-text chat replies to a choice option id when possible. */
export function resolveChoiceFromChat(step: WorkRequestChatStep, text: string): string | null {
  if (step.kind !== 'single_choice' || !step.options) return null
  const normalized = text.trim().toLocaleLowerCase()
  if (!normalized) return null
  const exact = step.options.find(
    (option) =>
      option.id.toLocaleLowerCase() === normalized ||
      option.label.toLocaleLowerCase() === normalized ||
      option.description?.toLocaleLowerCase() === normalized,
  )
  if (exact) return exact.id
  const partial = step.options.filter((option) =>
    option.label.toLocaleLowerCase().includes(normalized),
  )
  return partial.length === 1 ? (partial[0]?.id ?? null) : null
}

export function humanize(value: string): string {
  return value.replace(/[_-]+/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase())
}

function lines(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 25)
}

function pairs(value: string, rightOptional = false) {
  return lines(value).flatMap((line) => {
    const [left, ...rest] = line.split('|')
    const right = rest.join('|').trim()
    if (!left?.trim() || (!right && !rightOptional)) return []
    return [{ left: left.trim(), right }]
  })
}
