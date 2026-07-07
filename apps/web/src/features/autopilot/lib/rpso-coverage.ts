import type { CampaignContext } from '@/app/(dashboard)/campaigns/[id]/_lib/types'

export type RpsoCoverageLevel = 'full' | 'limited' | 'none'

export function mergeCampaignContext(raw: unknown): CampaignContext {
  const base: CampaignContext = {
    purpose: '',
    result: '',
    strategy: '',
    off_limits: [],
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return base
  const o = raw as Record<string, unknown>
  return {
    ...base,
    purpose: typeof o.purpose === 'string' ? o.purpose : base.purpose,
    result: typeof o.result === 'string' ? o.result : base.result,
    strategy: typeof o.strategy === 'string' ? o.strategy : base.strategy,
    off_limits: Array.isArray(o.off_limits)
      ? o.off_limits.filter((x): x is string => typeof x === 'string')
      : base.off_limits,
  }
}

export function rpsoCoverageLevel(ctx: CampaignContext): RpsoCoverageLevel {
  const r = ctx.result?.trim() ?? ''
  const p = ctx.purpose?.trim() ?? ''
  const s = ctx.strategy?.trim() ?? ''
  if (r && p && s) return 'full'
  if (r || p || s || (ctx.off_limits?.length ?? 0) > 0) return 'limited'
  return 'none'
}

export function countFullStrategyCampaigns(contexts: Array<{ context: CampaignContext }>): number {
  return contexts.filter((row) => rpsoCoverageLevel(row.context) === 'full').length
}
