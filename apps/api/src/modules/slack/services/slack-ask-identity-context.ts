/**
 * Helpers for injecting Slack channel → client identity into Pixel ask prompts.
 */

export type SlackAskClientStamp = {
  channelId: string
  channelName: string | null
  pageGraderClientId: string | null
  pageGraderClientName: string | null
  roasCampaignId: string | null
  roasCampaignName: string | null
}

/** Turn `#roas-yasir-khan-coaching-ltd-955` into searchable client tokens. */
export function clientSearchHintFromSlackChannelName(
  channelName: string | null | undefined,
): string | null {
  if (!channelName) return null
  const raw = channelName.replace(/^#/, '').trim().toLowerCase()
  if (!raw) return null

  let body = raw
  if (body.startsWith('roas-')) body = body.slice('roas-'.length)
  // Trailing numeric portal ids (e.g. -955) are not part of the legal name.
  body = body.replace(/-\d{2,}$/, '')

  const words = body
    .split(/[-_]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 1 && !['llc', 'ltd', 'inc', 'co'].includes(part))

  if (words.length === 0) return null
  return words.join(' ')
}

export type SlackAskIdentityOptions = {
  /**
   * N0 ask kind for this turn. On `general` asks the channel mapping is context
   * only — the block must not tell Pixel to do client work.
   */
  askKind?: 'continuation' | 'client' | 'team' | 'general' | 'unclear'
}

export function formatSlackAskIdentityContext(
  stamp: SlackAskClientStamp,
  options: SlackAskIdentityOptions = {},
): string {
  const lines = ['[Slack channel identity]']
  const channelLabel = stamp.channelName
    ? `#${stamp.channelName.replace(/^#/, '')}`
    : stamp.channelId
  lines.push(`Channel: ${channelLabel} (${stamp.channelId})`)

  const hint = clientSearchHintFromSlackChannelName(stamp.channelName)
  if (hint) lines.push(`Client search hint: ${hint}`)

  const generalAsk = options.askKind === 'general'
  if (stamp.pageGraderClientId || stamp.pageGraderClientName) {
    lines.push(
      `Resolved ROAS Portal client: ${stamp.pageGraderClientName ?? 'unknown'}${
        stamp.pageGraderClientId ? ` (id=${stamp.pageGraderClientId})` : ''
      }`,
    )
    lines.push(
      generalAsk
        ? "This channel maps to that client, but the current ask is about the operator's own world. Do not treat this client as the work to do unless the ask names it."
        : 'Use this client for Service Requests and Portal fulfillment. Do not ask which client unless this conflicts with an explicitly different named client.',
    )
  } else if (hint) {
    lines.push(
      generalAsk
        ? `This channel name suggests a client ("${hint}"), but the current ask is about the operator's own world. Do not run list_clients for it.`
        : `Resolve the Portal client with list_clients using "${hint}" (and the channel name). If exactly one client matches, use it — do not ask the user which client.`,
    )
  }

  if (stamp.roasCampaignId || stamp.roasCampaignName) {
    lines.push(
      `Mapped ROAS campaign: ${stamp.roasCampaignName ?? 'unknown'}${
        stamp.roasCampaignId ? ` (id=${stamp.roasCampaignId})` : ''
      }`,
    )
  }

  return lines.join('\n')
}
