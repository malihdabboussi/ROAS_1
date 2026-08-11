type Row = Record<string, unknown>

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '')
const number = (value: unknown) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}
const key = (value: unknown) =>
  text(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
const money = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)

function evidence(row?: Row): string {
  if (!row) return 'No campaign-level Meta snapshot was supplied.'
  const current = (row.current as Row | undefined) ?? {}
  const range = (row.current_range as Row | undefined) ?? {}
  const parts = [
    number(current.spend) !== null ? `spend ${money(number(current.spend)!)}` : '',
    number(current.leads) !== null ? `${number(current.leads)} leads` : '',
    number(current.cpl) !== null ? `CPL ${money(number(current.cpl)!)}` : '',
    number(current.ctr) !== null ? `link CTR ${number(current.ctr)!.toFixed(2)}%` : '',
  ].filter(Boolean)
  const date = [text(range.since), text(range.until)].filter(Boolean).join('–')
  return `${date ? `${date}: ` : ''}${parts.join(', ') || 'No reported delivery metrics.'}`
}

function learning(row?: Row): string {
  if (!row) return 'Use the meeting to confirm whether this campaign is live and measurable.'
  const current = (row.current as Row | undefined) ?? {}
  const prior = (row.prior as Row | undefined) ?? {}
  const currentCpl = number(current.cpl)
  const priorCpl = number(prior.cpl)
  if (currentCpl !== null && priorCpl !== null && priorCpl > 0) {
    const change = ((currentCpl - priorCpl) / priorCpl) * 100
    return `CPL ${change <= 0 ? 'improved' : 'increased'} ${Math.abs(change).toFixed(1)}% versus the prior available period.`
  }
  if ((number(current.spend) ?? 0) > 0 && (number(current.leads) ?? 0) === 0) {
    return 'Spend is present without reported leads, so the conversion path needs diagnosis.'
  }
  return 'The source does not contain enough prior-period data for a reliable trend claim.'
}

export function buildCampaignNotesFromPrepContext(context: Row): string {
  const campaigns = Array.isArray(context.active_campaigns)
    ? (context.active_campaigns as Row[])
    : []
  const latest = (context.latest_meta_performance as Row | undefined) ?? {}
  const performance = (latest.performance as Row | undefined) ?? {}
  const metaRows = Array.isArray(performance.campaigns) ? (performance.campaigns as Row[]) : []
  const sourceRows = campaigns.length > 0 ? campaigns : metaRows
  return sourceRows
    .slice(0, 10)
    .map((campaign) => {
      const name = text(campaign.name) || text(campaign.campaign_name) || 'Unnamed campaign'
      const id = text(campaign.id) || text(campaign.campaign_id)
      const meta = metaRows.find(
        (row) =>
          (id && text(row.campaign_id) === id) ||
          (key(name) && key(row.campaign_name) === key(name)),
      )
      const state =
        [text(campaign.status), text(campaign.platform_status), text(campaign.strategy_status)]
          .filter(Boolean)
          .join(' / ') || 'status not supplied'
      const next =
        text(campaign.next_action) ||
        'Confirm the next budget or creative test using lead quality and the dated performance evidence.'
      return `- **${name}** — State: ${state}. Evidence: ${evidence(meta)} What changed / learned: ${learning(meta)} Recommended next move: ${next}`
    })
    .join('\n')
}
