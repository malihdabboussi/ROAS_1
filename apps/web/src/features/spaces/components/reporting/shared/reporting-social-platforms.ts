import type { SocialAnalyticsPlatform } from '@/lib/reporting/social-analytics-types'
import type { ReportingViewConfig } from '../../../types/space-schema'

const PLATFORM_ORDER: SocialAnalyticsPlatform[] = ['instagram', 'linkedin', 'facebook', 'youtube']

const PLATFORM_SET = new Set<SocialAnalyticsPlatform>(PLATFORM_ORDER)

function isPlatform(value: unknown): value is SocialAnalyticsPlatform {
  return typeof value === 'string' && PLATFORM_SET.has(value as SocialAnalyticsPlatform)
}

export function normalizeReportingSocialPlatforms(
  config: ReportingViewConfig,
): SocialAnalyticsPlatform[] {
  const raw = config.social_platforms
  if (Array.isArray(raw) && raw.length > 0) {
    const set = new Set<SocialAnalyticsPlatform>()
    for (const p of raw) {
      if (isPlatform(p)) set.add(p)
    }
    if (set.size === 0) return [config.social_platform ?? 'instagram']
    return PLATFORM_ORDER.filter((x) => set.has(x))
  }
  const single = config.social_platform ?? 'instagram'
  return isPlatform(single) ? [single] : ['instagram']
}

export function patchReportingSocialPlatforms(
  platforms: SocialAnalyticsPlatform[],
): Pick<ReportingViewConfig, 'social_platforms' | 'social_platform'> {
  const ordered = PLATFORM_ORDER.filter((x) => platforms.includes(x))
  const next = ordered.length > 0 ? ordered : (['instagram'] as SocialAnalyticsPlatform[])
  return { social_platforms: next, social_platform: next[0] ?? 'instagram' }
}

export type ReportingSocialConnectionOptions = {
  instagram: unknown[]
  linkedin: unknown[]
  facebook: unknown[]
  youtube: unknown[]
}

/** Only platforms with at least one campaign/org connection; falls back to configured when none match. */
export function filterReportingSocialPlatformsToConnected(
  config: ReportingViewConfig,
  connOpts: ReportingSocialConnectionOptions | null,
): SocialAnalyticsPlatform[] {
  const configured = normalizeReportingSocialPlatforms(config)
  if (!connOpts) return configured
  const connected = PLATFORM_ORDER.filter((p) => (connOpts[p]?.length ?? 0) > 0)
  return configured.filter((p) => connected.includes(p))
}

export function reportingSocialPlatformsEqual(
  a: SocialAnalyticsPlatform[],
  b: SocialAnalyticsPlatform[],
): boolean {
  return a.length === b.length && a.every((p, i) => p === b[i])
}
