export const QUICK_MISSIONS_MESSAGES = {
  startedToast: (missionTitle: string) => `${missionTitle} started`,
  startedReceipt: (missionTitle: string, missionId: string) =>
    `Quick Mission started: **${missionTitle}**. [Open mission](/mission-control?mission=${encodeURIComponent(missionId)})`,
} as const
