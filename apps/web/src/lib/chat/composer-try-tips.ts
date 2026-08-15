export const COMPOSER_TRY_TIP_MESSAGES = {
  badge: 'Tip',
  try: 'Try',
  tryTooltip: 'Opens as a new task',
  dismiss: 'Dismiss tip',
} as const

export type ComposerTryTipSeedMode = 'send' | 'attach'

export type ComposerTryTip = {
  id: string
  body: string
  prompt: string
  seedMode: ComposerTryTipSeedMode
}

export const COMPOSER_TRY_TIPS: readonly ComposerTryTip[] = [
  {
    id: 'slides',
    body: 'Building a slide deck? Attach your source material and a brief.',
    prompt: 'Create a presentation from the source material I will attach. Brief: ',
    seedMode: 'attach',
  },
  {
    id: 'mention',
    body: 'Need a funnel or offer in context? Type @ to attach it instead of pasting.',
    prompt:
      'Show me how to @ mention a funnel, offer, or sequence in this chat, then draft from the attached artifact.',
    seedMode: 'send',
  },
  {
    id: 'slash',
    body: 'Type / in the message box to run a skill or workflow this agent has.',
    prompt: 'List the skills and workflows I can run with / in this chat, then recommend one to try.',
    seedMode: 'send',
  },
  {
    id: 'brain',
    body: 'Ask Pixel to pull the client Brain before it writes, so answers stay on-brand.',
    prompt:
      'Pull the relevant Brain for this client or campaign. Summarize what you know, what is missing, and what to confirm before we work.',
    seedMode: 'send',
  },
  {
    id: 'meetings',
    body: 'Turn a call into follow-ups. Ask Pixel to recap the latest meeting.',
    prompt: 'Recap my latest meeting and list the follow-up tasks I should create.',
    seedMode: 'send',
  },
  {
    id: 'delegate',
    body: 'Hand specialist work to another agent instead of keeping it in this thread.',
    prompt: 'Delegate this to the right agent: ',
    seedMode: 'attach',
  },
  {
    id: 'task',
    body: 'Create a real Space task instead of leaving a checklist in chat.',
    prompt: 'Create a task for ',
    seedMode: 'attach',
  },
  {
    id: 'integrations',
    body: 'Connected Gmail, Slack, or Meta? Ask Pixel what it can do with them.',
    prompt:
      'What integrations are connected, and what can I ask you to do with Gmail, Slack, Stripe, or Meta from this chat?',
    seedMode: 'send',
  },
]

const DAY_MS = 86_400_000

export function pickComposerTryTip(
  dismissedIds: readonly string[],
  nowMs: number = Date.now(),
): ComposerTryTip | null {
  const remaining = COMPOSER_TRY_TIPS.filter((tip) => !dismissedIds.includes(tip.id))
  if (remaining.length === 0) return null
  const day = Math.floor(nowMs / DAY_MS)
  return remaining[day % remaining.length] ?? remaining[0] ?? null
}
