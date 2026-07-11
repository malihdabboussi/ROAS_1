export const ROAS_APPS_DOMAIN_SUFFIX = '-app.roas.io'
export const ROAS_PLATFORM_API_URL = 'https://api.roas.io'
export const ROAS_APP_URL = 'https://app.roas.io'
export const ROAS_MARKETING_URL = 'https://roas.io'
export const ROAS_MCP_RESOURCE_URL = 'https://mcp.roas.io'
export const ROAS_LINK_PREVIEW_INTERNAL_HOSTS =
  'roas.io,app.roas.io,api.roas.io,sites.roas.io,agents.roas.io'

export function resolveAppsDomainSuffix(): string {
  return process.env.APPS_DOMAIN_SUFFIX || ROAS_APPS_DOMAIN_SUFFIX
}

export function resolvePlatformApiUrl(): string {
  return process.env.PLATFORM_API_URL || ROAS_PLATFORM_API_URL
}

export function resolveAppUrl(): string {
  return process.env.APP_URL || ROAS_APP_URL
}

export function resolveMarketingSiteUrl(): string {
  return ROAS_MARKETING_URL
}
