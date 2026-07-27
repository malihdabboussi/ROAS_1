export type PageGraderBulkSendStep = 'client' | 'type' | 'assignee' | 'preview'

export function isNotConnectedError(message: string | null): boolean {
  if (!message) return false
  return /(page grader|the roas portal) is not connected/i.test(message)
}

export function stepSubtitle(step: PageGraderBulkSendStep, selectedCount: number): string {
  if (step === 'client')
    return `${selectedCount} task${selectedCount > 1 ? 's' : ''} → pick a client`
  if (step === 'type') return 'What type of request is this?'
  if (step === 'assignee') return 'Who should own this in The ROAS Portal?'
  return 'Preview before sending'
}
