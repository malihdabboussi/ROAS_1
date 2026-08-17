export const QC_FOLLOW_UP_MESSAGES = {
  unchanged: (clientLabel: string | null): string => {
    const who = clientLabel?.trim() ? ` for ${clientLabel.trim()}` : ''
    return `These items${who} are still open. Were any of them finalized? Reply here and I will mark them done — I will not start a new check-in for the same work.`
  },
  changed: (clientLabel: string | null, summaries: string[]): string => {
    const who = clientLabel?.trim() ? clientLabel.trim() : 'this client'
    const items = summaries.map((summary) => `• ${summary}`).join('\n')
    return `Still tracking ${who}. Latest open items:\n${items}\n\nWere any of these finalized? Reply in this thread — I will not start a new check-in for the same work.`
  },
}
