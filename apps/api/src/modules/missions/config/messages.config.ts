export const MISSION_MESSAGES = {
  ACCESS_DENIED_SUBTASK_FEEDBACK:
    'Access denied. This step is paused until its required access is approved on a new request.',
  ACCESS_APPROVED_PROGRESS: 'Access approved. Resuming eligible mission work.',
  ACCESS_PARTIALLY_APPROVED_PROGRESS:
    'Selected access approved. Other access-gated steps are still waiting for approval.',
  ACCESS_DENIED_PROGRESS: 'Access denied for a gated step. Independent mission work can continue.',
  ACCESS_PARTIALLY_DENIED_PROGRESS:
    'Access denied for a selected step. Other access requests are still waiting for approval.',
} as const
