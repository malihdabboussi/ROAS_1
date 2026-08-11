export interface SlackTeamAutomationPreviewResult {
  preview: true
  action_results: Record<string, unknown>[]
  skipped_reason?: 'unsupported_actions'
}

export async function previewSlackTeamAutomation(input: {
  findSpace: () => Promise<unknown>
  findAutomation: () => Promise<{
    is_draft?: boolean
    trigger: Record<string, unknown>
    actions: Record<string, unknown>[]
  } | null>
  executeAction: (
    action: Record<string, unknown>,
    automationTimezone: string,
  ) => Promise<Record<string, unknown>>
}): Promise<SlackTeamAutomationPreviewResult> {
  if (!(await input.findSpace())) return { preview: true, action_results: [] }
  const automation = await input.findAutomation()
  if (!automation || automation.is_draft) return { preview: true, action_results: [] }
  if (automation.actions.some((action) => action.type !== 'observe_slack_team')) {
    return { preview: true, action_results: [], skipped_reason: 'unsupported_actions' }
  }
  const timezone = String(automation.trigger.timezone ?? 'America/Los_Angeles')
  const actionResults: Record<string, unknown>[] = []
  for (const action of automation.actions) {
    actionResults.push(await input.executeAction(action, timezone))
  }
  return { preview: true, action_results: actionResults }
}
