/** Status labels shown while a chat turn is being prepared. */

export const BRAIN_CONTEXT_TOOL = {
  name: 'brain_context',
  action: 'read_brain_context',
  labels: [
    'Reading your Brain',
    'Searching your Brain',
    'Finding useful memories',
    'Reviewing relevant Brain context',
    'Pulling relevant Brain context',
  ],
} as const
export const CONTEXT_READY_STATUS_LABELS = [
  'Connecting the dots',
  'Planning next moves',
  'Thinking through it',
  'Moving things along',
  'Checking the next step',
] as const
