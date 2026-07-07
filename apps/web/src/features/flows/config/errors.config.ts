export const FLOW_BUILD_PLAN_UI = {
  INTENT_STRUCTURE_NOTICE:
    'This plan saved the workflow as prose here instead of structured Steps. Ask Loop to move trigger/action detail into Steps.',
} as const

export const FLOW_VALIDATION_UI = {
  BANNER_INVALID: "Can't publish yet",
  BANNER_VALID: 'Ready to publish',
  BANNER_VALID_PUBLISHED: 'Ready to save changes',
  VALIDATE_TOOLTIP:
    'Checks every step is configured correctly before you publish or save changes.',
  ASK_LOOP: 'Ask Loop to fix',
  GENERIC: "Something in this flow isn't ready to publish yet.",
  CARD_ATTENTION_ARIA: 'View validation issues',
  MODAL_GO_BACK: 'Go back',
} as const

export type FlowValidationErrorDisplay = {
  userMessage: string
  technicalMessage: string
  loopPromptLine: string
}

type ParsedPath =
  | { scope: 'flow'; field: string }
  | { scope: 'trigger'; field: string }
  | { scope: 'action'; index: number; field: string }

const FIELD_LABELS: Record<string, string> = {
  assignee_type: 'assignee',
  assignee_id: 'assignee',
  assignees: 'assignee',
  subject_template: 'email subject',
  body_template: 'email body',
  prompt_template: 'prompt',
  agent_key: 'agent',
  title_template: 'task title',
  continuation: 'step timing',
  type: 'action type',
  output_type: 'output type',
  schedule: 'schedule',
  name: 'flow name',
  repo_url: 'GitHub repo URL',
  connection_id: 'Cursor connection',
}

function parseErrorPath(path: string): ParsedPath | null {
  const actionMatch = /^actions\.(\d+)\.(.+)$/.exec(path.trim())
  if (actionMatch) {
    const indexValue = actionMatch[1]
    const field = actionMatch[2]
    if (indexValue && field) {
      return { scope: 'action', index: Number(indexValue), field }
    }
    return null
  }
  if (path.startsWith('trigger.')) {
    return { scope: 'trigger', field: path.slice('trigger.'.length) }
  }
  if (path.length > 0) return { scope: 'flow', field: path }
  return null
}

function stepLabel(index: number): string {
  return `Step ${index + 1}`
}

function locationPrefix(parsed: ParsedPath | null): string {
  if (!parsed) return 'This flow'
  if (parsed.scope === 'action') return stepLabel(parsed.index)
  if (parsed.scope === 'trigger') return 'Trigger'
  return 'Flow'
}

function fieldLabel(field: string): string {
  return FIELD_LABELS[field] ?? field.replace(/_/g, ' ')
}

function splitPathMessage(raw: string): { path: string; message: string } | null {
  const idx = raw.indexOf(': ')
  if (idx <= 0) return null
  return { path: raw.slice(0, idx).trim(), message: raw.slice(idx + 2).trim() }
}

function formatEnumInvalid(
  parsed: ParsedPath | null,
  expected: string,
  received: string,
  technicalMessage: string,
): FlowValidationErrorDisplay {
  const where = locationPrefix(parsed)

  if (parsed?.field === 'assignee_type') {
    const userMessage = `${where}: Choose a team member or agent as the assignee — "${received}" isn't supported.`
    return {
      userMessage,
      technicalMessage,
      loopPromptLine: userMessage,
    }
  }

  const field = parsed ? fieldLabel(parsed.field) : 'value'
  const userMessage = `${where}: ${field} must be one of ${expected.replaceAll("'", '')}, not "${received}".`
  return {
    userMessage,
    technicalMessage,
    loopPromptLine: userMessage,
  }
}

function formatKnownMessage(path: string, message: string): FlowValidationErrorDisplay | null {
  const parsed = parseErrorPath(path)
  const where = locationPrefix(parsed)
  const field = parsed ? fieldLabel(parsed.field) : 'field'
  const technicalMessage = `${path}: ${message}`

  if (message === 'Subject is required') {
    const userMessage = `${where}: Add an email subject.`
    return { userMessage, technicalMessage, loopPromptLine: userMessage }
  }
  if (message === 'Body is required') {
    const userMessage = `${where}: Add an email body.`
    return { userMessage, technicalMessage, loopPromptLine: userMessage }
  }
  if (message === 'Publish the automation before enabling it') {
    const userMessage = 'Publish this flow before turning it on.'
    return { userMessage, technicalMessage: message, loopPromptLine: userMessage }
  }
  if (message.includes('artifact output requires waiting until the task completes')) {
    const userMessage = `${where}: When an agent step saves an artifact, set it to run after the task completes.`
    return { userMessage, technicalMessage, loopPromptLine: userMessage }
  }
  if (message.includes('after_task_completes is only supported for agent steps')) {
    const userMessage = `${where}: "After task completes" timing only works on agent or Cursor steps.`
    return { userMessage, technicalMessage, loopPromptLine: userMessage }
  }
  if (message.includes('is not supported for time-based (schedule) triggers')) {
    const userMessage = `${where}: This action can't run on a schedule trigger — pick a different step or trigger.`
    return { userMessage, technicalMessage, loopPromptLine: userMessage }
  }
  if (message.includes('needs ') && message.includes(' context first')) {
    const userMessage = `${where}: An earlier step must provide the required data before this action can run.`
    return { userMessage, technicalMessage, loopPromptLine: userMessage }
  }
  if (message === 'Required' || message.includes('must contain at least 1 character')) {
    const userMessage = `${where}: ${field.charAt(0).toUpperCase()}${field.slice(1)} is required.`
    return { userMessage, technicalMessage, loopPromptLine: userMessage }
  }
  if (parsed?.scope === 'trigger' && parsed.field === 'schedule') {
    const userMessage = `Trigger: Fix the schedule — ${message.charAt(0).toLowerCase()}${message.slice(1)}`
    return { userMessage, technicalMessage, loopPromptLine: userMessage }
  }

  return null
}

export function formatFlowValidationError(raw: string): FlowValidationErrorDisplay {
  const trimmed = raw.trim()
  if (!trimmed) {
    return {
      userMessage: FLOW_VALIDATION_UI.GENERIC,
      technicalMessage: raw,
      loopPromptLine: FLOW_VALIDATION_UI.GENERIC,
    }
  }

  const parts = splitPathMessage(trimmed)
  if (parts) {
    const parsed = parseErrorPath(parts.path)
    const enumMatch = /^Invalid enum value\. Expected (.+), received '(.+)'$/.exec(parts.message)
    if (enumMatch) {
      const expected = enumMatch[1]
      const received = enumMatch[2]
      if (expected && received) {
        return formatEnumInvalid(parsed, expected, received, trimmed)
      }
    }

    const known = formatKnownMessage(parts.path, parts.message)
    if (known) return known

    const where = locationPrefix(parsed)
    const field = parsed ? fieldLabel(parsed.field) : 'setting'
    const userMessage = `${where}: Check the ${field} — ${parts.message.charAt(0).toLowerCase()}${parts.message.slice(1)}`
    return { userMessage, technicalMessage: trimmed, loopPromptLine: userMessage }
  }

  const known = formatKnownMessage('flow', trimmed)
  if (known) return known

  return {
    userMessage: FLOW_VALIDATION_UI.GENERIC,
    technicalMessage: trimmed,
    loopPromptLine: trimmed,
  }
}

export function buildFlowValidationLoopPrompt(input: {
  flowName: string
  flowId: string
  errors: string[]
}): string {
  const lines = input.errors.map((raw) => {
    const formatted = formatFlowValidationError(raw)
    return `- ${formatted.loopPromptLine}\n  Technical: ${formatted.technicalMessage}`
  })

  return [
    'This flow failed validation. Please inspect the draft, fix the issues, and re-validate.',
    '',
    `Flow: ${input.flowName}`,
    `Flow id: ${input.flowId}`,
    '',
    'Issues:',
    ...lines,
  ].join('\n')
}
