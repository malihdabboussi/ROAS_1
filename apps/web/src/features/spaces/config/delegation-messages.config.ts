import type { DelegationDispatchMode } from '../services/delegation-intake.service'

export const DELEGATION_MODE_MESSAGES: Record<
  DelegationDispatchMode,
  { label: string; description: string }
> = {
  batch: {
    label: 'Batch',
    description: 'Consolidate the work and keep it in the private Delegation Desk.',
  },
  review: {
    label: 'Review first',
    description: 'Prepare clear work items and wait for your approval before delegation.',
  },
  urgent: {
    label: 'Urgent',
    description: 'Check context and duplicates, then dispatch in this run.',
  },
}

export const DELEGATION_TOAST_MESSAGES = {
  CAPTURED: (count: number) =>
    `Captured ${count} task${count === 1 ? '' : 's'} as outstanding work in the Delegation Desk.`,
  CAPTURED_AND_CREATED_DESK: (count: number) =>
    `Created your Delegation Desk and captured ${count} task${count === 1 ? '' : 's'} as outstanding work.`,
  CAPTURE_FAILED: 'Could not capture that delegation batch. Try again.',
  THOUGHT_CAPTURED: 'Added to your Delegation Desk.',
  THOUGHT_CAPTURE_FAILED: 'Could not add that thought. Try again.',
  OPEN_FAILED: 'Could not open the Delegation Desk. Try again.',
} as const

export const DELEGATION_DESK_MESSAGES = {
  DESCRIPTION:
    'Drop rough ideas, promises, and loose ends here. Delegator will organize them before anything is assigned.',
  PLACEHOLDER: 'Brain dump anything that still needs to happen...',
  EMPTY: 'Nothing is waiting here.',
  EMPTY_DETAIL: 'Add a thought above, or send selected work here from any Space.',
  LOADING: 'Opening your Delegation Desk...',
  LOAD_FAILED: 'Could not load your Delegation Desk.',
} as const
