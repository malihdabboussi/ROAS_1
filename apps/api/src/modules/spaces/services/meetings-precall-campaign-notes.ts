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
const CAMPAIGN_TOKENS = ['webinar', 'vsl', 'quiz', 'funnel', 'rentvestor', 'portfolio']

function findMetaRow(campaign: Row, metaRows: Row[]): Row | undefined {
  const id = text(campaign.id) || text(campaign.campaign_id)
  const name = key(campaign.name) || key(campaign.campaign_name)
  const candidates = metaRows.filter((row) => {
    const rowName = key(row.campaign_name)
    return (
      (id && text(row.campaign_id) === id) ||
      (name && rowName === name) ||
      CAMPAIGN_TOKENS.some((token) => name.includes(token) && rowName.includes(token))
    )
  })
  return candidates.sort((a, b) => {
    const aRange = (a.current_range as Row | undefined) ?? {}
    const bRange = (b.current_range as Row | undefined) ?? {}
    const byDate = text(bRange.until).localeCompare(text(aRange.until))
    if (byDate !== 0) return byDate
    return (
      (number((b.current as Row | undefined)?.spend) ?? 0) -
      (number((a.current as Row | undefined)?.spend) ?? 0)
    )
  })[0]
}

function nextMove(campaign: Row, state: string): string {
  const supplied = text(campaign.next_action)
  if (supplied) return supplied
  const normalized = state.toLowerCase()
  if (normalized.includes('on_hold') || normalized.includes('closed')) {
    return 'Keep this on hold until funnel QA and tracking are complete.'
  }
  if (normalized.includes('planning') || normalized.includes('building')) {
    return 'Complete final QA before launch, then begin with a controlled test budget.'
  }
  return 'Keep the campaign active while we review lead quality and the next creative test.'
}

function evidence(row?: Row): string {
  if (!row) return ''
  const current = (row.current as Row | undefined) ?? {}
  const range = (row.current_range as Row | undefined) ?? {}
  const parts = [
    number(current.spend) !== null ? `spend ${money(number(current.spend)!)}` : '',
    number(current.leads) !== null ? `${number(current.leads)} leads` : '',
    number(current.cpl) !== null ? `CPL ${money(number(current.cpl)!)}` : '',
    number(current.ctr) !== null ? `link CTR ${number(current.ctr)!.toFixed(2)}%` : '',
  ].filter(Boolean)
  const date = [text(range.since), text(range.until)].filter(Boolean).join('–')
  return `${date ? `${date}: ` : ''}${parts.join(', ')}`
}

function learning(row?: Row): string {
  if (!row) return ''
  const current = (row.current as Row | undefined) ?? {}
  const prior = (row.prior as Row | undefined) ?? {}
  const currentCpl = number(current.cpl)
  const priorCpl = number(prior.cpl)
  if (currentCpl !== null && priorCpl !== null && priorCpl > 0) {
    const change = ((currentCpl - priorCpl) / priorCpl) * 100
    return `CPL ${change <= 0 ? 'improved' : 'increased'} ${Math.abs(change).toFixed(1)}% versus the prior available period.`
  }
  if ((number(current.spend) ?? 0) > 0 && (number(current.leads) ?? 0) === 0) {
    return 'The campaign spent without generating a reported lead, so we are reviewing the conversion path.'
  }
  return ''
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
      const meta = findMetaRow(campaign, metaRows)
      const state = [
        text(campaign.status),
        text(campaign.platform_status),
        text(campaign.strategy_status),
      ]
        .filter(Boolean)
        .join(' / ')
      const next = nextMove(campaign, state)
      const details = [evidence(meta), learning(meta), next].filter(Boolean).join(' ')
      return `- **${name}** — ${details}`
    })
    .join('\n')
}
