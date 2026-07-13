export const ROAS_MARKETING_URL = 'https://roas.io'
export const ROAS_APP_URL = 'https://app.roas.io'
export const ROAS_API_URL = 'https://api.roas.io'
export const ROAS_PUBLIC_AGENT_HOST_SUFFIX = 'agents.roas.io'
export const ROAS_APPS_DOMAIN_SUFFIX = '-app.roas.io'
export const ROAS_FUNNELS_URL = 'https://sites.roas.io'

export function resolveMarketingSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_VIBEY_PLATFORM_URL?.trim() ||
    process.env.NEXT_PUBLIC_GOVIBEY_URL?.trim() ||
    ROAS_MARKETING_URL
  )
}

export function resolveAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.APP_URL?.trim() || ROAS_APP_URL
}

export function resolvePlatformApiUrl(): string {
  return (
    process.env.NEXT_PUBLIC_BACKEND_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim() ||
    process.env.BACKEND_URL?.trim() ||
    ROAS_API_URL
  ).replace(/\/+$/, '')
}

export function resolveAppsDomainSuffix(): string {
  return process.env.NEXT_PUBLIC_APPS_DOMAIN_SUFFIX?.trim() || ROAS_APPS_DOMAIN_SUFFIX
}

export function buildPublishedAppUrl(slug: string): string {
  return `https://${slug}${resolveAppsDomainSuffix()}`
}

export function buildPublishedFunnelUrl(slug: string): string {
  return `${ROAS_FUNNELS_URL}/${slug}`
}

export function resolvePublicAgentHostSuffix(): string {
  return process.env.NEXT_PUBLIC_PUBLIC_AGENT_HOST_SUFFIX?.trim() || ROAS_PUBLIC_AGENT_HOST_SUFFIX
}

export function buildPublicAgentHost(userSlug: string): string {
  return `${userSlug}.${resolvePublicAgentHostSuffix()}`
}

export function buildPublicAgentApiUrl(userSlug: string, agentKey: string, path: string): string {
  return `https://${buildPublicAgentHost(userSlug)}/a/${agentKey}/api/${path}`
}

export function buildPublicAgentPageUrl(userSlug: string, agentKey: string): string {
  return `https://${buildPublicAgentHost(userSlug)}/a/${agentKey}`
}

export function buildPlatformWebhookUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${resolvePlatformApiUrl()}${normalizedPath}`
}
