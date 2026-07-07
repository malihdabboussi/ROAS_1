export type MissionReliabilityData = {
  windowDays: number
  since: string
  subtasksTouchedInWindow: number
  sampledSubtasks: number
  missionsTouchedInWindow: number
  subtasksByStatus: Record<string, number>
  missionsByStatus: Record<string, number>
  missionCompletion: {
    done: number
    terminalFailed: number
    denominator: number
    doneRate: number | null
  }
  staleMissions: {
    count: number
    thresholdHours: number
    statusesObserved: string[]
  }
  feedbackBuckets: Record<string, number>
  feedbackSummary: {
    subtasksWithNonEmptyFeedback: number
    classifiedCount: number
    unclassifiedCount: number
  }
  outbox: {
    byStatus: Record<string, number>
    processingNow: number
    stuckProcessingCount: number
    staleLockedAfterMinutes: number
    nearMaxAttempts: number
    deadLetter: number
  }
  outboxProcessingCount: number
  missionsLogs: {
    totalEvents: number
    byEventType: Record<string, number>
    topTransitions: { from: string | null; to: string | null; count: number }[]
    aggregatesRequireDirectDb: boolean
  }
  subtaskTouchesByDay: { day: string; count: number }[]
  topAgentsByFeedbackVolume: { agentKey: string | null; count: number }[]
}
