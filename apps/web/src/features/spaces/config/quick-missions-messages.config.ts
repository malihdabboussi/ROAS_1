export const QUICK_MISSIONS_MESSAGES = {
  startedToast: (missionTitle: string) => `${missionTitle} started`,
  receiptSaveFailed: 'Mission started, but its chat card could not be saved.',
  startedReceipt: (missionTitle: string) => `Quick Mission started: **${missionTitle}**.`,
} as const
