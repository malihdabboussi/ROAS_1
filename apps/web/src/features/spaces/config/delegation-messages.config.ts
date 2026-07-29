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
  OPEN_FAILED: 'Could not open the Delegation Desk. Try again.',
} as const
