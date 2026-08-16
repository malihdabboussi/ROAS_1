export const COMPOSER_TRY_TIP_MESSAGES = {
  badge: 'Tip',
  try: 'Try',
  tryTooltip: 'Opens as a new task',
  dismiss: 'Dismiss tip',
} as const

export const COMPOSER_TRY_TIP_ROTATE_MS = 12_000

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
    prompt:
      'List the skills and workflows I can run with / in this chat, then recommend one to try.',
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
  {
    id: 'voice',
    body: 'Hit ⌘D to dictate, or ⌘S to start a live voice call instead of typing.',
    prompt: 'Start a voice call so I can brief you out loud instead of typing.',
    seedMode: 'send',
  },
  {
    id: 'queue',
    body: 'Keep typing while Pixel replies — your next message queues automatically.',
    prompt: 'Queue a follow-up after this reply: ',
    seedMode: 'attach',
  },
  {
    id: 'campaign-mention',
    body: 'Need an artifact from another campaign? Type @ then open the Campaigns tab.',
    prompt: 'Show me how to @ mention an artifact from another campaign in this chat.',
    seedMode: 'send',
  },
  {
    id: 'drop-file',
    body: 'Drop a file on the chat to attach it, or use the paperclip for Drive and Dropbox.',
    prompt: 'I am about to attach a file. Tell me the fastest way to get it into this chat.',
    seedMode: 'send',
  },
  {
    id: 'model',
    body: 'Pick a different model for one message from the dropdown under the input.',
    prompt: 'Which model should I use for this next message, and why?',
    seedMode: 'send',
  },
  {
    id: 'newline',
    body: 'Shift+Enter adds a new line; Enter sends the message.',
    prompt: 'Draft a multi-line brief I can send as one message.',
    seedMode: 'send',
  },
]

export function composerTryTipRotationSeed(conversationId?: string | null): number {
  if (!conversationId) return 0
  let hash = 0
  for (let i = 0; i < conversationId.length; i += 1) {
    hash = (hash + conversationId.charCodeAt(i) * (i + 1)) % 10_000
  }
  return hash
}

export function pickComposerTryTip(
  dismissedIds: readonly string[],
  rotationIndex: number = 0,
): ComposerTryTip | null {
  const remaining = COMPOSER_TRY_TIPS.filter((tip) => !dismissedIds.includes(tip.id))
  if (remaining.length === 0) return null
  const index = ((rotationIndex % remaining.length) + remaining.length) % remaining.length
  return remaining[index] ?? remaining[0] ?? null
}
