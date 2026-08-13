import type { SlackObservationMessage } from '../../slack/types/slack-observation.types'

function optionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

/** Preserve Page Grader's deterministic client mapping when a Slack message reaches Pixel. */
export function formatSlackObservationText(message: SlackObservationMessage): string {
  const text = message.text.trim()
  const metadata = message.metadata && typeof message.metadata === 'object' ? message.metadata : {}
  const clientName = optionalString(metadata.page_grader_client_name)
  const campaignName = optionalString(metadata.page_grader_campaign_name)
  if (!clientName && !campaignName) return text

  const scope = [
    clientName ? `client: ${clientName}` : null,
    campaignName ? `campaign: ${campaignName}` : null,
  ]
    .filter(Boolean)
    .join('; ')
  return `[Page Grader context — ${scope}]\n${text}`
}
